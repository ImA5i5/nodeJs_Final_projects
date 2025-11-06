// app/services/otp.service.js
const Otp = require("../models/Otp");
const EmailService = require("./email.service");

class OtpService {
  static async generate(email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt });

    await EmailService.sendOtpEmail(email, otp);
    return otp;
  }

  static async verify(email, otp) {
    const record = await Otp.findOne({ email, otp });
    if (!record || record.expiresAt < Date.now()) return false;
    await Otp.deleteMany({ email });
    return true;
  }
}

module.exports = OtpService;
