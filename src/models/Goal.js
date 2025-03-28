const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        targetAmount: { type: Number, required: true },
        savedAmount: { type: Number, default: 0 },
        deadline: { type: Date, required: true },
        autoAllocate: { type: Boolean, default: false }, // Automatically allocate savings
        allocationPercentage: { type: Number, default: 10 }, // Percentage of income to allocate
        category: { type: String, enum: ['Car', 'Home', 'Education', 'Vacation', 'Emergency', 'Retirement', 'Other'] },
        priority: { type: Number, default: 1 }, // 1 = highest, 5 = lowest
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for progress percentage
GoalSchema.virtual('progress').get(function() {
    return Math.min(100, Math.round((this.savedAmount / this.targetAmount) * 100));
});

// Virtual for days remaining until deadline
GoalSchema.virtual('daysRemaining').get(function() {
    const today = new Date();
    const timeDiff = this.deadline - today;
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
});

module.exports = mongoose.model("Goal", GoalSchema);
