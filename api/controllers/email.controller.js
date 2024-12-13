import transporter from "../utils/transporter.js";

export const sendConfirmationCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and code are required." });
  }

  try {
    await transporter.sendMail({
      from: '"Your App Name" <your-email@gmail.com>',
      to: email,
      subject: "Your Confirmation Code",
      text: `Your confirmation code is: ${code}`,
      html: `<p>Your confirmation code is: <strong>${code}</strong></p>`,
    });

    res.json({ success: true, message: "Confirmation code sent successfully." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send confirmation code." });
  }
};
