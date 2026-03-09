const asyncHandler = require('express-async-handler');
const WoodItem = require('../models/WoodItem');

// @desc    Get all wood items
// @route   GET /api/woods
const getWoodItems = asyncHandler(async (req, res) => {
    const { species, minPrice, maxPrice, sort } = req.query;
    let query = {};

    // Filtering
    if (species) {
        query.species = { $regex: species, $options: 'i' };
    }

    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = {};
    if (sort) {
        const parts = sort.split(':');
        sortOption[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
        sortOption = { createdAt: -1 };
    }

    const woodItems = await WoodItem.find(query).sort(sortOption);
    res.json(woodItems);
});

// @desc    Get single wood item
// @route   GET /api/woods/:id
const getWoodItemById = asyncHandler(async (req, res) => {
    const woodItem = await WoodItem.findById(req.params.id);

    if (!woodItem) {
        res.status(404);
        throw new Error('Wood item not found');
    }

    res.json(woodItem);
});

// @desc    Create wood item (Admin only)
// @route   POST /api/woods
const createWoodItem = asyncHandler(async (req, res) => {
    const woodItem = await WoodItem.create(req.body);
    res.status(201).json(woodItem);
});

// @desc    Update wood item (Admin only)
// @route   PUT /api/woods/:id
const updateWoodItem = asyncHandler(async (req, res) => {
    const woodItem = await WoodItem.findById(req.params.id);

    if (!woodItem) {
        res.status(404);
        throw new Error('Wood item not found');
    }

    const updatedWoodItem = await WoodItem.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.json(updatedWoodItem);
});

// @desc    Delete wood item (Admin only)
// @route   DELETE /api/woods/:id
const deleteWoodItem = asyncHandler(async (req, res) => {
    const woodItem = await WoodItem.findById(req.params.id);

    if (!woodItem) {
        res.status(404);
        throw new Error('Wood item not found');
    }

    await woodItem.deleteOne();
    res.json({ message: 'Wood item removed' });
});


module.exports = {
    getWoodItems,
    getWoodItemById,
    createWoodItem,
    updateWoodItem,
    deleteWoodItem,
};