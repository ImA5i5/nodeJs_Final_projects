// app/services/email.service.js
const transporter = require("../config/mailer");
const winston = require("../config/winston");

class EmailService {
  /**
   * Send OTP Email
   */
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
      winston.info(`✅ OTP email sent to ${email}`);
    } catch (err) {
      winston.error(`❌ OTP Email Error: ${err.message}`);
      throw new Error("Email sending failed.");
    }
  }

  /**
   * General-purpose Notification Email
   */
  static async sendNotification(email, subject, htmlMessage) {
    try {
      if (!email) {
        winston.warn("⚠️ Attempted to send email without 'email' specified.");
        return;
      }

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html: typeof htmlMessage === "string" ? htmlMessage : `<p>${htmlMessage}</p>`,
      });

      winston.info(`📧 Notification sent to ${email} | ${subject}`);
    } catch (err) {
      winston.error("❌ Notification Email failed: " + err.message);
    }
  }

  /** Additional helper for Payment Released */
  static async sendPaymentReleased(email, amount, milestoneName = "") {
    const html = `
      <p>Your payment for <b>${milestoneName}</b> has been released.</p>
      <p>Amount Released: <b>₹${amount}</b></p>
    `;
    await this.sendNotification(email, "✅ Payment Released", html);
  }

  /** Additional helper for Escrow Funded */
  static async sendEscrowFunded(email, amount, milestoneName = "") {
    const html = `
      <p>Escrow funded for milestone <b>${milestoneName}</b>.</p>
      <p>Amount: <b>₹${amount}</b></p>
    `;
    await this.sendNotification(email, "💰 Escrow Funded", html);
  }
}

module.exports = EmailService;
