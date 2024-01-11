import express from "express";
import multer from "multer";

import { createPatientTreatment, getPatientTreatmentFile, updatePatientTreatment } from '../controllers/doctor';
import protect from "../middleware/auth";

const router = express.Router();

router.use(protect);

router.route('/:id')
    .get(multer().any(), getPatientTreatmentFile)
    .post(multer().any(), createPatientTreatment)
    .put(multer().any(), updatePatientTreatment);

export default router;
