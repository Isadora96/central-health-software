import express from "express";

import { createPatient, deletePatient, getPatient, getPatients, updatePatient } from '../controllers/patient';
import protect from "../middleware/auth";

const router = express.Router();

router.use(protect);

router.route('/:id')
    .get(getPatient)
    .put(updatePatient)
    .delete(deletePatient);
router.route('/')
    .get(getPatients)
    .post(createPatient);

export default router; 