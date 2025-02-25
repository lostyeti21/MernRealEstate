import express from 'express';
import { createReservation, acceptReservation, rejectReservation } from '../controllers/reservation.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/create', verifyToken, createReservation);
router.put('/accept/:id', verifyToken, acceptReservation);
router.put('/reject/:id', verifyToken, rejectReservation);

export default router;
