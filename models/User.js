const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Make sure crypto is imported

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'REGISTERED_COMPANY'],
        default: 'REGISTERED_COMPANY',
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
    },
    number: {
        type: String,
        default: "+23765459"
    },
    avatar: {
        type: String,
    },
    // OTP fields
    resetPasswordOTP: {
        type: String,
        default: null
    },
    resetPasswordOTPExpire: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ ADD THIS METHOD - Generate OTP
userSchema.methods.generateOTP = function () {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP for storage (for security)
    this.resetPasswordOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    // Set expiry (10 minutes)
    this.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000;

    // Return the plain OTP to send via email
    return otp;
};

// ✅ ADD THIS METHOD - Verify OTP (optional helper)
userSchema.methods.verifyOTP = function (candidateOTP) {
    const hashedCandidate = crypto
        .createHash('sha256')
        .update(candidateOTP)
        .digest('hex');

    return this.resetPasswordOTP === hashedCandidate &&
        this.resetPasswordOTPExpire > Date.now();
};

module.exports = mongoose.model('User', userSchema);