const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorMiddleware');
const { protect } = require('./middleware/authMiddleware');
const { checkSubscription } = require('./middleware/subscriptionCheck');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route imports
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const woodRoutes = require('./routes/woodRoutes');
const orderRoutes = require('./routes/orderRoutes');
const otpRoutes = require('./routes/otpRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// PUBLIC ROUTES (No auth required)
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/woods', woodRoutes);

// PAYMENT WEBHOOK - Public (Nkwa needs to access this)
app.use('/api/payments/webhook', paymentRoutes);

// PROTECTED ROUTES (Auth required)
app.use('/api/companies', protect, companyRoutes);
app.use('/api/orders', protect, orderRoutes);
app.use('/api/payments', protect, paymentRoutes);

// SUBSCRIPTION ROUTES - For super admins (protected + subscription check)
const {
    initiatePayment,
    getSubscriptionStatus,
    getPaymentHistory,
    checkPaymentStatus
} = require('./controllers/paymentController');

// All subscription routes require authentication and active subscription
app.get('/api/subscription/status', protect, checkSubscription, getSubscriptionStatus);
app.get('/api/subscription/history', protect, checkSubscription, getPaymentHistory);
app.post('/api/subscription/pay', protect, initiatePayment); // Initiate doesn't need subscription check
app.get('/api/subscription/check/:transactionId', protect, checkPaymentStatus);

// Admin stats - simple endpoint for super admins
app.get('/api/admin/stats', protect, checkSubscription, async (req, res) => {
    try {
        // Check if user is super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Access denied. Super admin only.' });
        }

        const Company = require('./models/Company');
        const User = require('./models/User');
        const Payment = require('./models/Payment');

        const [totalCompanies, pendingCompanies, totalUsers, totalPayments] = await Promise.all([
            Company.countDocuments(),
            Company.countDocuments({ status: 'PENDING' }),
            User.countDocuments({ role: 'REGISTERED_COMPANY' }),
            Payment.countDocuments({ status: 'SUCCESS' })
        ]);

        res.json({
            success: true,
            stats: {
                companies: {
                    total: totalCompanies,
                    pending: pendingCompanies
                },
                users: {
                    total: totalUsers
                },
                payments: {
                    total: totalPayments,
                    revenue: totalPayments * 50
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'Timber Platform API',
        endpoints: {
            auth: '/api/auth',
            companies: '/api/companies',
            woods: '/api/woods',
            orders: '/api/orders',
            otp: '/api/otp',
            payments: '/api/payments',
            subscription: '/api/subscription',
            admin: '/api/admin/stats'
        }
    });
});

// ❌ REMOVE THIS WILDCARD ROUTE - This is causing the error
// app.use('*', (req, res) => {
//     res.status(404).json({ error: 'Route not found' });
// });

// ✅ Use this instead - a proper 404 handler without wildcard
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Error handler (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Payment webhook: http://localhost:${PORT}/api/payments/webhook/nkwa`);
    console.log(`💰 Subscription endpoints:`);
    console.log(`   - GET  /api/subscription/status`);
    console.log(`   - GET  /api/subscription/history`);
    console.log(`   - POST /api/subscription/pay`);
    console.log(`   - GET  /api/subscription/check/:id`);
    console.log(`📊 Admin stats: http://localhost:${PORT}/api/admin/stats`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Error: ${err.message}`);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`❌ Uncaught Exception: ${err.message}`);
    console.log(err.stack);
    process.exit(1);
});