import transporter from "../utils/transporter.js";

export const sendConfirmationCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and code are required." });
  }

  try {
    await transporter.sendMail({
      from: '"Dzimba Estate Confirmation Code" <academiceyeaju@gmail.com>', // Ensure this matches your Gmail
      to: email,
      subject: "Please enter this 6 digit code onto the Dzimba Estate website for confirmation",
      text: `Your confirmation code is: ${code}`,
      html: `<p>Your confirmation code is: <strong>${code}</strong></p>`,
    });

    res.json({ success: true, message: "Confirmation code sent successfully." });
  } catch (error) {
    console.error("Error sending email:", error);

    // Check for specific error codes
    if (error.responseCode === 535 || error.message.includes("Invalid login")) {
      return res.status(500).json({
        success: false,
        message: "Invalid login credentials. Please verify Gmail App Password.",
      });
    }

    res.status(500).json({ success: false, message: "Failed to send confirmation code." });
  }
};
