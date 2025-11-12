// scripts/generateSignature.js
const crypto = require("crypto");

// Replace these with real values from Razorpay Test Mode
const orderId = "order_RelwQQGUrxo9ST";
const paymentId = "plink_ReoZWqf2Ol1E0c";
const secret = "4Fc8DOQP7I2goivPfbZupAs3"; // From Razorpay Dashboard → Settings → API Keys

const signature = crypto
  .createHmac("sha256", secret)
  .update(orderId + "|" + paymentId)
  .digest("hex");

console.log("✅ Razorpay Signature:", signature);
