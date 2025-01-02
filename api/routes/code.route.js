import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { generateCode, getCode, verifyCode } from '../controllers/code.controller.js';

const router = express.Router();

router.get('/generate', verifyToken, generateCode);
router.get('/get', verifyToken, getCode);
router.post('/verify', verifyCode);

export default router;
