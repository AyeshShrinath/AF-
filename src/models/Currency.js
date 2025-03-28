const mongoose = require("mongoose");

const CurrencySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    baseCurrency: { type: String, required: true },
    preferredCurrencies: [{ type: String }], // List of user-selected currencies
});

module.exports = mongoose.model("Currency", CurrencySchema);
