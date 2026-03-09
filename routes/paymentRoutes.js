const express = require('express');
const router = express.Router();
const {
    initiatePayment,
    nkwaWebhook,
    checkPaymentStatus,
    getSubscriptionStatus,
    getPaymentHistory
} = require('../controllers/paymentController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// Public webhook (no auth)
router.post('/webhook/nkwa', nkwaWebhook);

// Protected routes
router.use(protect);

// Super admin only routes
router.use(superAdmin);

// Subscription management
router.get('/subscription', getSubscriptionStatus);
router.post('/initiate', initiatePayment);
router.get('/check/:transactionId', checkPaymentStatus);
router.get('/history', getPaymentHistory);

module.exports = router;