const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["income", "expense"], required: true },
        amount: { type: Number, required: true },
        category: { type: String, required: true }, // Categorization
        description: { type: String },
        date: { type: Date, default: Date.now },
        tags: [{ type: String }], // Custom labels for filtering
        isRecurring: { type: Boolean, default: false }, // Recurring transactions
        recurrencePattern: { type: String, enum: ["daily", "weekly", "monthly"], default: null }, // Pattern
        recurrenceEndDate: { type: Date, default: null } // End date for recurring transactions
    },
    { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
