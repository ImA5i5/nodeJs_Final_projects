// app/services/email.service.js
const transporter = require("../config/mailer");
const winston = require("../config/winston");

class EmailService {
  static async sendOtpEmail(email, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Verification - Freelancer Marketplace",
        html: `
          <h3>Your verification code is:</h3>
          <h1 style="letter-spacing:4px">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      winston.info(`OTP email sent successfully to ${email}`);
    } catch (err) {
      winston.error("Error sending OTP email: " + err.message);
      throw new Error("Email sending failed.");
    }
  }

  static async sendNotification(email, subject, message) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html: `<p>${message}</p>`,
      });
    } catch (err) {
      winston.error("Notification email failed: " + err.message);
    }
  }
}

module.exports = EmailService;
