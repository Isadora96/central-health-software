import { Request, Response, NextFunction } from 'express';

import { CloudantClient } from '../config/db';
import { Patient } from '../models/patient';
import * as makeLooger from "../../api/logger/logger";

const logger = makeLooger.default;

// @desc     Get patients
// @route    GET /api/v1/patient
// @access   Private
const getPatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { result } = await new CloudantClient('patients').query({"doctor_uid": req.currentUser}, [], 100);
        if (result.docs.length >= 1 && result.docs[0].doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Patients does not correspond with doctor ' + req.currentUser });
        }
        if(result.docs.length >= 1 && result.docs[0].doctor_uid === req.currentUser ) {
            logger.info({ type: 'LOG_TYPE_GET_PATIENTS', message: `Patients retrived successfully!` });
            return res.status(200).json({ success: true, data: result.docs });
        } 
        if (!result.docs.length) {
            return res.status(200).json({ success: true, data: result.docs });
        }
        logger.error({ type: 'LOG_TYPE_GET_PATIENTS', message: `Internal Server Error. Patients db query.` });
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err: any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            logger.debug({ type: 'LOG_TYPE_GET_PATIENTS', message: `${err.status} - ${err.result.error}` });
            return res.status(404).json({ success: false, message: err.result.reason });
        }
        logger.warn({ type: 'LOG_TYPE_GET_PATIENTS', message: `${err.status} - ${err.result}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

// @desc     Get single patient
// @route    GET /api/v1/patient/:id
// @access   Private
const getPatient = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    try {
        const response = await new CloudantClient('patients').get(id);
        if (response.status === 200 && response.result.doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this patient' });
        }
        if(response.status === 200 && response.result.doctor_uid === req.currentUser) {
            logger.info({ type: 'LOG_TYPE_GET_PATIENT', message: `Patient ${id} retrived successfully!` });
            return res.status(200).json({ success: true, data: response.result });
        } 
        logger.error({ type: 'LOG_TYPE_GET_PATIENT', message: `Internal Server Error. Patients db get.`});
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err: any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).json({ success: false, response: `Patient not found with id of ${req.params.id}` });
        }
        logger.warn({ type: 'LOG_TYPE_GET_PATIENT', message: `${err.status} - ${err.result || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

// @desc     Create patient
// @route    POST /api/v1/patient
// @access   Private
const createPatient = async (req: Request, res: Response, next: NextFunction) => {

    const { name, gender, symptoms, identity, birth } = req.body

    if(!name || !gender || !symptoms || !identity || !birth) {
        return res.status(400).json({ success: false, missing_data: 'name, gender, symptoms, identity or birth'});
    }

    try {
        const { result } = await new CloudantClient('patients').query({"identity": identity}, ["_id"], 1);
        if(result.docs.length >= 1) {
            return res.status(400).json({ success: false, message: `Patient already exists! ID: ${result.docs[0]._id}`  });
        }
    } catch (error) {
        logger.error({ type: 'LOG_TYPE_POST_PATIENT', message: `Internal Server Error. Patients db query.`});
        return res.status(500).send({message: "Internal Server Error"});
    }

    try {
        const pacient = new Patient(name, identity, birth, gender, symptoms, req.currentUser!);
        const response = await new CloudantClient('patients').insert(pacient);
        if(response.status === 201) {
            logger.info({ type: 'LOG_TYPE_POST_PATIENT', message: `Patient ${name} inserted successfully!` });
            return res.status(201).json({ success: true, data: response?.result });
        }
        logger.error({ type: 'LOG_TYPE_POST_PATIENT', message: `Internal Server Error. Patients db insert.`});
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err: any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).json({ success: false, message: err.result.reason});
        }
        logger.warn({ type: 'LOG_TYPE_POST_PATIENT', message: `${err.status} - ${err.result || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

// @desc     Update patient
// @route    PUT /api/v1/patient/:id
// @access   Private
const updatePatient = async (req: Request, res: Response, next: NextFunction) => {

    const { name, gender, symptoms, identity, birth } = req.body;
    const id = req.params.id;

    const patient = new CloudantClient('patients');
    try {
        const { result } = await patient.query({"_id": id}, [], 1);
        if(result.docs.length >= 1 && result.docs[0].doctor_uid === req.currentUser) {
            result.docs[0].name = name ? name : result.docs[0].name;
            result.docs[0].gender = gender ? gender : result.docs[0].gender;
            result.docs[0].symptoms = symptoms ? symptoms : result.docs[0].symptoms;
            result.docs[0].identity = identity ? identity : result.docs[0].identity;
            result.docs[0].birth = birth ? birth : result.docs[0].birth;
            result.docs[0].updated_at = new Date().toUTCString();
            const resp = await patient.update(id, result.docs[0]);
            if (resp.status === 201) {
                logger.info({ type: 'LOG_TYPE_PUT_PATIENT', message: `Patient ${id} updated successfully!` });
                return res.status(200).json({ success: true, data: resp?.result });
            }
            logger.error({ type: 'LOG_TYPE_PUT_PATIENT', message: `Internal Server Error. Patients db update.`});
            return res.status(500).json({ success: false });
        } 
        if (result.docs.length >= 1 && result.docs[0].doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this patient'});
        } 
        if (!result.docs.length) {
            return res.status(404).json({ success: false, message: `Patient id ${id} not found`});
        }
        logger.error({ type: 'LOG_TYPE_PUT_PATIENT', message: `Internal Server Error. Patients db query.`});
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err: any) {
        if (err.status === 409) {
            return res.status(409).json({ success: false, message: err.result.reason});
        }
        logger.warn({ type: 'LOG_TYPE_PUT_PATIENT', message: `${err.status} - ${err.result || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

// @desc     Delete patient
// @route    DELETE /api/v1/patient/:id
// @access   Private
const deletePatient = async (req: Request, res: Response, next: NextFunction) => {

    const patient = new CloudantClient('patients');
    
    try {
        const { result } = await patient.query({"_id": req.params.id}, ["_id", "_rev", "doctor_uid"], 1);
        if(result.docs.length >= 1 && result.docs[0].doctor_uid !== req.currentUser) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this patient'});
        }
        if(result.docs.length >= 1 && result.docs[0].doctor_uid === req.currentUser) {
            const resp = await patient.delete(req.params.id, result.docs[0]._rev!);
            if(resp.status === 200) {
                logger.info({ type: 'LOG_TYPE_DELETE_PATIENT', message: `Patient ${req.params.id} deleted successfully!` });
                return res.status(200).json({ success: true, data: resp.result });
            }
            logger.error({ type: 'LOG_TYPE_DELETE_PATIENT', message: `Internal Server Error. Patients db delete.`});
            return res.status(500).send({message: "Internal Server Error"});
        }
        if(!result.docs.length) {
            return res.status(404).json({ success: false, message: 'Patient not found'});
        }
        logger.error({ type: 'LOG_TYPE_DELETE_PATIENT', message: `Internal Server Error. Patients db query.`});
        return res.status(500).send({message: "Internal Server Error"});
    } catch (err: any) {
        if(err.status === 400) {
            return res.status(400).json({ success: false, message: err.result.reason });
        }
        logger.warn({ type: 'LOG_TYPE_DELETE_PATIENT', message: `${err.status} - ${err.result || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};

export {
    getPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient
}