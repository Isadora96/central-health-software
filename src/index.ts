import express from "express";

import patient from './api/routes/patient';
import doctor from './api/routes/doctor';
import treatment from './api/routes/treatment';

const router = express.Router();

router.use('/api/v1/patient', patient);
router.use('/api/v1/doctor/treatment/patient', doctor);
router.use('/api/v1/treatment', treatment);

export default router;