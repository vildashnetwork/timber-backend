const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    woodItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WoodItem',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
    },
    species: String,
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
        default: 'PENDING',
    },
    shippingAddress: {
        address: String,
        city: String,
        country: String,
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED'],
        default: 'PENDING',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);