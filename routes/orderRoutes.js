const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders, // Add this import
    updateOrderStatus,
} = require('../controllers/orderController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// IMPORTANT: Order matters - put specific routes before parameterized routes

// Create new order (POST /api/orders)
router.route('/')
    .post(protect, createOrder);

// Get all orders for admin (GET /api/orders/all) - THIS MUST COME BEFORE /:id
router.get('/all', protect, superAdmin, getAllOrders);

// Get my orders (GET /api/orders/myorders) - THIS MUST COME BEFORE /:id
router.get('/myorders', protect, getMyOrders);

// Get single order by ID (GET /api/orders/:id) - This comes AFTER specific routes
router.get('/:id', protect, getOrderById);

// Update order status (PUT /api/orders/:id/status)
router.put('/:id/status', protect, superAdmin, updateOrderStatus);

module.exports = router;