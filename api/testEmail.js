import transporter from "./path/to/transporter.js";

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"Test App" <noreply@test.com>', // Sender's email address
      to: "recipient@example.com", // Replace with recipient email
      subject: "Test Email",
      text: "This is a test email sent from Ethereal.", // Plain text body
      html: "<b>This is a test email sent from Ethereal.</b>", // HTML body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info)); // Ethereal-specific
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

sendTestEmail();
