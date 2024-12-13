import { createTransport } from "nodemailer";

const transporter = createTransport({
  service: "gmail",
  auth: {
    user: "academiceyeaju@gmail.com", // Replace with your Gmail address
    pass: "qovb zhel xtww akse",    // Replace with your App Password
  },
});

export default transporter;
