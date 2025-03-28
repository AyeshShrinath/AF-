const mongoose = require("mongoose");

const BudgetSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        period: { type: String, enum: ["monthly", "weekly", "daily"], required: true },
        spent: { type: Number, default: 0 }, // Tracks spent amount
        alertThreshold: { type: Number, default: 80 }, // Alert when 80% spent
        recommendations: { type: String, default: "" } // Budget adjustment recommendations
    },
    { timestamps: true }
);

module.exports = mongoose.model("Budget", BudgetSchema);
