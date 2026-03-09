const express = require('express');
const router = express.Router();
const {
    initiatePayment,
    checkPaymentStatus,
    refreshPendingPayments,
    manualUpdatePayment,
    getSubscriptionStatus,
    getPaymentHistory,
    paymentWebhook
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// ============ PUBLIC ROUTES (No Authentication Required) ============
router.post('/webhook', paymentWebhook);

// ============ PROTECTED ROUTES (Authentication Required) ============
router.use(protect);

// ============ SUBSCRIPTION MANAGEMENT ROUTES ============
router.get('/subscription', getSubscriptionStatus);
router.get('/history', getPaymentHistory);
router.post('/refresh-pending', refreshPendingPayments);

// ============ PAYMENT INITIATION & STATUS ROUTES ============
router.post('/initiate', initiatePayment);
router.get('/check/:transactionId', checkPaymentStatus);
router.post('/manual-update/:paymentId', manualUpdatePayment);

// ============ UTILITY ROUTES ============
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Payment routes working',
        user: {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role
        },
        timestamp: new Date().toISOString()
    });
});

router.get('/stats', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const Subscription = require('../models/Subscription');

        const adminId = req.user._id;

        const [totalPayments, successfulPayments, pendingPayments, failedPayments, subscription] = await Promise.all([
            Payment.countDocuments({ admin: adminId }),
            Payment.countDocuments({ admin: adminId, status: 'SUCCESS' }),
            Payment.countDocuments({ admin: adminId, status: 'PENDING' }),
            Payment.countDocuments({ admin: adminId, status: 'FAILED' }),
            Subscription.findOne({ admin: adminId })
        ]);

        const totalSpent = await Payment.aggregate([
            { $match: { admin: adminId, status: 'SUCCESS' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalPayments,
                successfulPayments,
                pendingPayments,
                failedPayments,
                totalSpent: totalSpent[0]?.total || 0,
                subscriptionStatus: subscription?.status || 'NO_SUBSCRIPTION',
                subscriptionEndDate: subscription?.endDate,
                isActive: subscription?.status === 'ACTIVE' && new Date() < new Date(subscription.endDate)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;