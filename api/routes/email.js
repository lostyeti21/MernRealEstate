import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";

dotenv.config();

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // Directory to save files
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
  }),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" || // Allow PDF files
      file.mimetype.startsWith("image/")     // Allow image files
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or image files are allowed"), false);
    }
  },
});

// Route to handle sending application emails
router.post("/send-application", upload.single("file"), async (req, res) => {
  const { companyName, email } = req.body;
  const file = req.file;

  if (!companyName || !email || !file) {
    return res.status(400).json({ success: false, message: "All fields are required, including a file upload." });
  }

  try {
    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_PASS, // Your Gmail app password
      },
    });

    // Verify the connection configuration
    await transporter.verify();
    console.log("Gmail credentials are valid.");

    // Email options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "academiceyeaju@gmail.com", // The recipient email address
      subject: "New Real Estate company request",
      text: `A new application has been submitted:
      
Real Estate Company Name: ${companyName}
Email: ${email}`,
      attachments: [
        {
          filename: file.originalname, // Original file name
          path: file.path,            // Path to the uploaded file
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Application email sent successfully." });
  } catch (error) {
    console.error("Error sending email:", error.message);

    // Handle specific errors
    if (error.responseCode === 535 || error.message.includes("Invalid login")) {
      res.status(500).json({
        success: false,
        message: "Invalid login credentials. Please verify your Gmail credentials or use an App Password.",
      });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email. Please try again later." });
    }
  }
});

export default router;
