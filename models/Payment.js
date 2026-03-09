const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'XAF'
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
    },
    paymentMethod: {
        type: String,
        enum: ['CARD', 'MOBILE_MONEY', 'MANUAL'],
        required: true
    },
    provider: {
        type: String,
        enum: ['STRIPE', 'PAYSTACK', 'FLUTTERWAVE', 'ORANGE_MONEY', 'MTN_MONEY', 'MANUAL'],
        default: 'MANUAL'
    },
    transactionId: String,
    providerReference: String,
    paymentDate: Date,
    metadata: mongoose.Schema.Types.Mixed,
    receipt: {
        url: String,
        sent: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);