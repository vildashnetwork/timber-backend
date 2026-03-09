const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorMiddleware');
const { protect } = require('./middleware/authMiddleware');

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
    console.log(`${req.method} ${req.path} - User: ${req.user?.email || 'Not authenticated'}`);
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
app.use('/api/payments', paymentRoutes); // Remove protect here since it's in paymentRoutes

// Admin stats - with proper role check
app.get('/api/admin/stats', protect, async (req, res) => {
    try {
        // Check if user is super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Super admin only.'
            });
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
            admin: '/api/admin/stats'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Payment webhook: http://localhost:${PORT}/api/payments/webhook/nkwa`);
    console.log(`💰 Payment endpoints:`);
    console.log(`   - GET  /api/payments/subscription`);
    console.log(`   - GET  /api/payments/history`);
    console.log(`   - POST /api/payments/initiate`);
    console.log(`   - GET  /api/payments/check/:transactionId`);
    console.log(`   - GET  /api/payments/test`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`❌ Error: ${err.message}`);
    process.exit(1);
});