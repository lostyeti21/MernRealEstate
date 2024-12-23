import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { uploadImage } from '../controllers/upload.controller.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB limit

router.post('/image', verifyToken, upload.single('image'), uploadImage);

export default router;
