const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route imports
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const woodRoutes = require('./routes/woodRoutes');
const orderRoutes = require('./routes/orderRoutes');
const Otproutes = require('./routes/otpRoutes');

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:8080',
    credentials: true,
}));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/woods', woodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/otp', Otproutes);

// Otproutes
// Base route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Timber Platform API' });
});


// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});