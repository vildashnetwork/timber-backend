const express = require('express');
const router = express.Router();
const {
    getWoodItems,
    getWoodItemById,
    createWoodItem,
    updateWoodItem,
    deleteWoodItem,
} = require('../controllers/woodController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getWoodItems)
    .post(protect, superAdmin, createWoodItem);

router.route('/:id')
    .get(getWoodItemById)
    .put(protect, superAdmin, updateWoodItem)
    .delete(protect, superAdmin, deleteWoodItem);

module.exports = router;