import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or image files are allowed"), false);
    }
  },
});

// Route to test email transporter
router.get("/test-email", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      logger: true,
      debug: true,
    });

    await transporter.verify();
    res.status(200).json({ success: true, message: "Email transporter verified successfully." });
  } catch (error) {
    console.error("Error verifying transporter:", error.message);
    res.status(500).json({ success: false, message: "Email transporter verification failed." });
  }
});

// Route to send application emails
router.post("/send-application", upload.single("file"), async (req, res) => {
  const { companyName, email } = req.body;
  const file = req.file;

  if (!companyName || !email || !file) {
    return res.status(400).json({
      success: false,
      message: "All fields are required, including a file upload.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      logger: true,
      debug: true,
    });

    await transporter.verify();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "academiceyeaju@gmail.com",
      subject: "New Real Estate company request",
      text: `A new application has been submitted:

Real Estate Company Name: ${companyName}
Email: ${email}`,
      attachments: [
        {
          filename: file.originalname,
          path: file.path,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Application email sent successfully." });
  } catch (error) {
    if (file) {
      fs.unlink(file.path, (err) => {
        if (err) console.error("Failed to delete file:", err);
      });
    }
    console.error("Error sending email:", error.message);
    res.status(500).json({ success: false, message: "Failed to send email. Please try again later." });
  }
});

export default router;
