import express from 'express';
import { createReservation } from '../controllers/reservation.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/create', verifyToken, createReservation);

export default router;
