import { Request, Response, NextFunction } from 'express';

import { CloudantClient } from '../config/db';
import { Bucket } from '../config/bucket';
import { PatientTreatment } from '../models/patient';
import { File } from "../models/file";
import * as makeLooger from "../../api/logger/logger";

const logger = makeLooger.default;

interface MulterRequest extends Request {
    files: any;
}

// @desc     Get patient treatment
// @route    GET /api/v1/doctor/treatment/patient/:id
// @access   Private
const getPatientTreatmentFile = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    Bucket.getItem(`${id}-${req.currentUser}`)
    .then((data: any) => {
        if (data != null) {
            logger.info({
                type: 'LOG_TYPE_GET_DOCTOR',
                message: 'Getting patient treatment file ' + id
            });
            res.set({
                'Cache-Control': 'no-cache',
                'Content-Type': data.ContentType,
                'Content-Length': data.ContentLength,
                'Content-Disposition': 'attachment; filename=' + `${id}.txt`,
                'mime-type': 'text/plain'
            });
            return res.status(200).send(data.Body);
        }    
    })
    .catch((e) => {
        if(e.code === 'NoSuchKey') {
            return res.status(400).send({message: `No document found with id ${id}`});
        } 
        logger.warn({
            type: 'LOG_TYPE_GET_DOCTOR',
            message: 'Internal Server Error' + e
        });
        return res.status(500).send({message: "Internal Server Error"});
    });
};

// @desc     Create patient treatment
// @route    POST /api/v1/doctor/treatment/patient/:id
// @access   Private
const createPatientTreatment = async (req: Request, res: Response, next: NextFunction) => {
    const docFile = (req as MulterRequest).files;

    const id = req.params.id;

    const cid = req.body.cid

    if(!req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(400).send('Content-Type must be multipart/form-data!');
    } else if (docFile[0].mimetype !== 'text/plain') {
        return res.status(400).send('File must be text/plain!');
    }

    if(!req.files || !cid) {
        return res.status(400).json({ success: false, missing_data: 'file or cid'});
    }

    const doctor = new CloudantClient('doctors');

    try {
        const { result } = await doctor.query({"patient": {"_id": id}}, ["patient"], 1);
        if(result.docs.length > 0 && result.docs[0].patient.doctor_uid === req.currentUser) {
            return res.status(400).send({message: `You already created a treatment for patient ${id}, please update.`});
        } 
        if (result.docs.length > 0 && result.docs[0].patient.doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Patient does not correspond with doctor ' + req.currentUser });
        }
    } catch (err: any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).json({ success: false, message: err.result.reason });
        }
        logger.warn({ type: 'LOG_TYPE_POST_DOCTOR', message: `${err.status} - ${err.result}` });
        return res.status(500).send({message: "Internal Server Error"});
    }

    try {
        const response = await new CloudantClient('patients').get(req.params.id);
        if(response.status === 200 && response.result.doctor_uid === req.currentUser) {
            const patient = new PatientTreatment(req.currentUser!, response.result, cid, {name: `${id}.txt`, size: docFile[0].size}, 'in treatment');
            Promise.all([(await Bucket.createTextFile(`${id}-${req.currentUser}`, docFile[0].buffer)).$response, (await doctor.insert(patient)).result])
            logger.info({ type: 'LOG_TYPE_POST_DOCTOR', message: `Patient treatment file ${id} created.`});
            return res.status(201).json({ success: true, data: { patient: response.result._id, doctor: req.currentUser!} });
        } 
        if (response.status === 200 && response.result.doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Patient does not correspond with doctor ' + req.currentUser });
        }
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err:any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).json({ success: false, reason: err.result.reason });
        }
        if(err.statusCode == 404 && err.code) {
            return res.status(404).json({ success: false, reason: err.code });
        }
        logger.warn({ type: 'LOG_TYPE_POST_DOCTOR', message: `${err.status || err.statusCode} - ${err.result || err.code || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }

};

// @desc     Update patient treatment
// @route    PUT /api/v1/doctor/treatment/patient/:id
// @access   Private
const updatePatientTreatment = async (req: Request, res: Response, next: NextFunction) => {
    const docFile = (req as MulterRequest).files;

    const id = req.params.id;

    const cured = req.body.cured;
    const options = ['cured', 'in treatment', 'incurable', 'no return'];


    if(!req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(400).send('Content-Type must be multipart/form-data!');
    } else if (docFile[0].mimetype !== 'text/plain') {
        return res.status(400).send('File must be text/plain!');
    }

    if(!req.files || !req.body.cured) {
        return res.status(400).json({ success: false, missing_data: 'file or cured'});
    }

    if(cured && !options.includes(cured) || cured == '') {
       return res.status(400).send({ message: `cured must be ${options.join(', ')}`});
    }

    try {
        const data = (await Bucket.getObjects()).Contents
        const doc = data?.find(item => item.Key === `${id}-${req.currentUser}`);
        if(!doc) {
            return res.status(404).json({ success: false, reason: 'No treatment file found for patient ' + id });
        } 
    } catch (err:any) {
        if(err.code === 'NoSuchBucket') {
            return res.status(err.statusCode).json({ success: false, message: err.code });
        }
        logger.warn({ type: 'LOG_TYPE_PUT_DOCTOR', message: `${err.statusCode || err.status} - ${err.code || err}` });
        return res.status(500).json({message: "Internal Server Error"});
    }

    const doctor = new CloudantClient('doctors');
    
    try {
        const { result } = await doctor.query({"patient._id": id}, [], 1);
        if (result.docs.length > 0 && result.docs[0].doctorUid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Patient does not correspond with doctor ' + req.currentUser });
        }
        if(result.docs.length > 0 && result.docs[0].doctorUid === req.currentUser) {
            result.docs[0].file_treatment = new File({name: id, size: docFile[0].size});
            result.docs[0].cured = cured;
            result.docs[0].updated_at = new Date().toUTCString();
            Promise.all([(await Bucket.updateItem(`${id}-${req.currentUser}`, docFile[0].buffer)).$response, (await doctor.update(result.docs[0]._id!, result.docs[0])).result]);
            logger.info({ type: 'LOG_TYPE_PUT_DOCTOR', message: `Patient treatment file ${id} updated.` });
            return res.status(200).json({ success: true, data: { patient: result.docs[0].patient._id, doctor: req.currentUser!, cured: result.docs[0].cured} });
        }  
        if (!result.docs.length) {
            return res.status(404).json({ success: false, message: `Nothing found`});
        }
    } catch (err:any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).send({ success: false, reason: err.result.reason });
        }
        if(err.statusCode == 404 && err.code) {
            return res.status(404).send({ success: false, reason: err.code });
        }
        if(err.statusCode == 409) {
            return res.status(409).send({ success: false, reason: err.result.reason });
        }
        logger.warn({ type: 'LOG_TYPE_PUT_DOCTOR', message: `${err.statusCode || err.status} - ${err.result || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

export {
    createPatientTreatment,
    getPatientTreatmentFile,
    updatePatientTreatment
}
