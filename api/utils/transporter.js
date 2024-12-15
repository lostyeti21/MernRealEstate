import { createTransport } from "nodemailer";

const transporter = createTransport({
  service: "gmail",
  auth: {
    user: "academiceyeaju@gmail.com",
    pass: "jhtpoeeeejjcfdnm",
  },
  logger: true, // Enable logging
  debug: true,  // Enable debug output
});

export default transporter;
