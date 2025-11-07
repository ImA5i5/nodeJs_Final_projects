// app/services/WalletService.js
const Wallet = require("../models/Wallet");
const winston = require("../config/winston");

class WalletService {
  /**
   * ✅ Ensure a wallet exists for the user
   */
  static async ensureWallet(userId) {
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        transactions: []
      });
      winston.info(`✅ Wallet created for user ${userId}`);
    }

    return wallet;
  }

  /**
   * ✅ Credit money to wallet (e.g., milestone release)
   */
  static async credit(userId, amount, reference = "") {
    if (amount <= 0) throw new Error("Credit amount must be positive");

    const wallet = await this.ensureWallet(userId);

    wallet.balance += amount;
    wallet.transactions.push({
      type: "credit",
      amount,
      reference,
      createdAt: new Date(),
    });

    await wallet.save();
    winston.info(`✅ Credited ₹${amount} to wallet of ${userId}`);

    return wallet;
  }

  /**
   * ✅ Debit wallet (e.g., admin payout)
   */
  static async debit(userId, amount, reference = "") {
    if (amount <= 0) throw new Error("Debit amount must be positive");

    const wallet = await this.ensureWallet(userId);

    if (wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    wallet.balance -= amount;
    wallet.transactions.push({
      type: "debit",
      amount,
      reference,
      createdAt: new Date(),
    });

    await wallet.save();
    winston.info(`✅ Debited ₹${amount} from wallet of ${userId}`);

    return wallet;
  }

  /**
   * ✅ Add a transaction entry without credit/debit
   *    (useful for disputes, refunds, notes)
   */
  static async addTransaction(userId, type, amount, reference = "") {
    const wallet = await this.ensureWallet(userId);

    wallet.transactions.push({
      type,
      amount,
      reference,
      createdAt: new Date(),
    });

    await wallet.save();
    return wallet;
  }

  /**
   * ✅ Get wallet details
   */
  static async getWallet(userId) {
    return this.ensureWallet(userId);
  }
}

module.exports = WalletService;
