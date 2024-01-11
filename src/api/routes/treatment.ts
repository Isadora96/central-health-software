import express from "express";

import { getTreatment } from '../controllers/treatment';

const router = express.Router();


router.get('/', getTreatment)

export default router;