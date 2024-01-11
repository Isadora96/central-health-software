import { Request, Response, NextFunction } from 'express';

import { CloudantClient } from '../config/db';
import { Bucket } from '../config/bucket';
import * as makeLooger from "../logger/logger";

const logger = makeLooger.default;

// @desc     Get treatment
// @route    GET /api/v1/treatment
// @query ?cid=10&cured=cured&limit=1
// @access   Public
const getTreatment = async (req: Request, res: Response, next: NextFunction) => {
        //@ts-ignore
    const curedQuery = req.query.cured && req.query.cured.includes('treatment') ? 'in treatment' : req.query.cured
        //@ts-ignore
    const limit = parseInt(req.query.limit, 10) || 100;
    const doc = new CloudantClient('doctors');

    try {
        const values = await Promise.all(
            [
                (await Bucket.getObjects()).Contents,
                (await doc.query(
                    {"cid": req.query.cid, "cured": curedQuery}, 
                    ["cid", "cured","patient._id","patient.birth","patient.gender", "patient.symptoms"], 
                    limit, 
                )).result
            ]
        );
        const ids = values[0]?.map(item => item.Key?.split('-')[0] && item.Key).filter(id => values[1].docs.map(item => item.patient._id === id));
        const filesContent = ids?.map(async id => { if(id) return { id, content: (await Bucket.getItem(id)).Body?.toString() }});
        if(filesContent) {
            const file = await Promise.all(filesContent)
            values[1].docs.forEach(({patient}, index) => {
                if(patient._id.includes(file[index]?.id.split('-')[0])) {
                    values[1].docs[index].treatment = file[index]?.content
                    delete values[1].docs[index].patient._id
                }
            });
            logger.info({ type: 'LOG_TYPE_GET_TREATMENT', message: `Treatments consulted! - CID: ${req.query.cid} - ${curedQuery || ''}` });
            return res.status(200).send({ success: true, data: values[1].docs })
        }
    } catch (err:any) {
        if(err.status == 404 && err.result.error === 'not_found') {
            return res.status(404).json({ success: false, message: err.result.reason });
        }
        if(err.statusCode == 404 && err.code) {
            return res.status(404).json({ success: false, message: err.code });
        }
        logger.warn({ type: 'LOG_TYPE_GET_TREATMENT', message: `${err.status || err.statusCode} - ${err.result || err.code || err}` });
        return res.status(500).send({message: "Internal Server Error"});
    }
};


export {
    getTreatment
}