const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED'],
        default: 'EXPIRED'
    },
    amount: {
        type: Number,
        default: 50 // 50 FCFA
    },
    currency: {
        type: String,
        default: 'XAF'
    },
    paymentMethod: {
        type: String,
        enum: ['CARD', 'MOBILE_MONEY', 'MANUAL'],
        default: 'MANUAL'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    paymentHistory: [{
        amount: Number,
        currency: String,
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILED', 'PENDING']
        },
        transactionId: String,
        paymentMethod: String,
        paymentDate: Date,
        metadata: mongoose.Schema.Types.Mixed
    }],
    gracePeriodEnd: Date,
    autoRenew: {
        type: Boolean,
        default: true
    },
    notifications: {
        paymentReminder: { type: Boolean, default: true },
        expiryWarning: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ admin: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ nextPaymentDate: 1 });

// Check if subscription is active
subscriptionSchema.methods.isActive = function () {
    return this.status === 'ACTIVE' && new Date() < this.endDate;
};

// Calculate next payment date
subscriptionSchema.methods.calculateNextPaymentDate = function () {
    const nextDate = new Date(this.endDate);
    nextDate.setDate(nextDate.getDate() + 7); // Add 7 days for weekly
    return nextDate;
};

// Update subscription on successful payment
subscriptionSchema.methods.renew = function (transactionId, paymentMethod = 'MANUAL') {
    const oldEndDate = this.endDate;

    this.status = 'ACTIVE';
    this.lastPaymentDate = new Date();
    this.endDate = this.calculateNextPaymentDate();
    this.nextPaymentDate = this.calculateNextPaymentDate();

    this.paymentHistory.push({
        amount: this.amount,
        currency: this.currency,
        status: 'SUCCESS',
        transactionId,
        paymentMethod,
        paymentDate: new Date(),
        metadata: {
            oldEndDate,
            newEndDate: this.endDate
        }
    });
};

// Mark as expired
subscriptionSchema.methods.expire = function () {
    this.status = 'EXPIRED';
    this.gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days grace period
};

module.exports = mongoose.model('Subscription', subscriptionSchema);