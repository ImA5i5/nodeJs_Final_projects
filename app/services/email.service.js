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

   /** ✅ New: User Verified Email */
  static async sendUserVerified(email, fullName = "") {
    try {
      const safeName = fullName && typeof fullName === "string" ? fullName : "there";
      const html = `
        <h2>Hello ${safeName},</h2>
        <p>Your account has been <b>successfully verified</b> by the admin.</p>
        <p>You can now log in and start using the platform.</p>
        <br/>
        <p>✅ Freelancer Marketplace Team</p>
      `;
      await this.sendNotification(email, "✅ Account Verified", html);
    } catch (err) {
      winston.error("❌ User Verified Email Error: " + err.message);
    }
  }

    /**
   * ✅ Send professional email when client hires a freelancer
   */
  static async sendFreelancerHired(freelancerEmail, freelancerName, clientName, projectTitle, budget) {
    const html = `
      <div style="font-family:Arial, sans-serif; background:#f6f9fc; padding:30px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; padding:25px; border-radius:10px; border:1px solid #e5e7eb;">
          
          <h2 style="color:#2563eb; text-align:center; margin-bottom:20px;">
            🎉 You’ve Been Hired!
          </h2>

          <p style="font-size:16px; color:#333;">
            Hi <strong>${freelancerName}</strong>,
          </p>

          <p style="font-size:15px; color:#444; line-height:1.6;">
            Great news! <strong>${clientName}</strong> has hired you for the project:
          </p>

          <h3 style="font-size:20px; margin:15px 0; color:#111; border-left:4px solid #2563eb; padding-left:10px;">
            ${projectTitle}
          </h3>

          <p style="margin:0; color:#444; font-size:15px;">
            <strong>💰 Budget:</strong> ₹${budget}
          </p>

          <div style="text-align:center; margin:30px 0;">
            <a href="${process.env.BASE_URL}/freelancer/my-projects"
               style="background:#2563eb; color:white; padding:12px 20px; 
                      text-decoration:none; border-radius:6px; font-weight:bold;">
              View Project → 
            </a>
          </div>

          <p style="font-size:14px; color:#555; line-height:1.5;">
            Please log in to your dashboard to accept the project and begin work.
          </p>

          <hr style="border:none; border-top:1px solid #eee; margin:25px 0;">

          <p style="font-size:12px; color:#666; text-align:center;">
            — Freelancer Marketplace Team<br>
            <span style="font-size:11px; color:#999;">This is an automated message. Please do not reply.</span>
          </p>
        </div>
      </div>
    `;

    return transporter.sendMail({
      from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
      to: freelancerEmail,
      subject: "✅ You Have Been Hired!",
      html
    });
  }

}

module.exports = EmailService;
