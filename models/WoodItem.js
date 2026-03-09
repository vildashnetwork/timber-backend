const mongoose = require('mongoose');

const woodItemSchema = new mongoose.Schema({
    species: {
        type: String,
        required: true,
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
            type: String,
            default: 'cm',
        },
    },
    price: {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    images: [{
        url: String,
        alt: String,
    }],
    description: String,
    category: String,
}, {
    timestamps: true,
});

module.exports = mongoose.model('WoodItem', woodItemSchema);