const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken'); // Import your token generator
const { sendBrevoOTPEmail, sendPasswordResetSuccessEmail } = require('../utils/brevoEmail');
const asyncHandler = require('express-async-handler');

// @desc    Forgot password - request OTP
// @route   POST /api/otp/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No user found with that email address');
    }

    // Generate OTP
    const otpCode = user.generateOTP();

    // Save user with OTP and expiry
    await user.save({ validateBeforeSave: false });

    try {
        // Send OTP via Brevo
        await sendBrevoOTPEmail(user.email, otpCode, user.name);

        res.status(200).json({
            success: true,
            message: 'Password reset OTP sent successfully. Please check your email.',
            expiresIn: '10 minutes'
        });

    } catch (error) {
        console.error('OTP email error:', error);

        // Clear OTP if email fails
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Failed to send OTP email. Please try again later.');
    }
});

// @desc    Verify OTP
// @route   POST /api/otp/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
        res.status(400);
        throw new Error('Please provide email and OTP code');
    }

    // Hash the provided OTP for comparison
    const hashedOTP = crypto
        .createHash('sha256')
        .update(otpCode)
        .digest('hex');

    // Find user by email and valid OTP
    const user = await User.findOne({
        email,
        resetPasswordOTP: hashedOTP,
        resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP code');
    }

    res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        email: user.email
    });
});

// @desc    Reset password with OTP
// @route   POST /api/otp/reset-password
// @access  Public
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
    const { email, otpCode, newPassword, confirmPassword } = req.body;

    if (!email || !otpCode || !newPassword || !confirmPassword) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    if (newPassword !== confirmPassword) {
        res.status(400);
        throw new Error('Passwords do not match');
    }

    if (newPassword.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    // Hash the provided OTP for comparison
    const hashedOTP = crypto
        .createHash('sha256')
        .update(otpCode)
        .digest('hex');

    // Find user by email and valid OTP
    const user = await User.findOne({
        email,
        resetPasswordOTP: hashedOTP,
        resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP code');
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;

    await user.save();

    // Send success email (non-blocking)
    try {
        await sendPasswordResetSuccessEmail(user.email, user.name);
    } catch (emailError) {
        console.error('Failed to send success email:', emailError);
        // Don't block the response
    }

    // Generate new token for auto-login
    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Password reset successful',
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});

// @desc    Resend OTP
// @route   POST /api/otp/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No user found with that email address');
    }

    // Generate new OTP
    const otpCode = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    try {
        await sendBrevoOTPEmail(user.email, otpCode, user.name);

        res.status(200).json({
            success: true,
            message: 'New OTP sent successfully',
            expiresIn: '10 minutes'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);

        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Failed to resend OTP. Please try again later.');
    }
});

// @desc    Validate reset token (optional - if you want to keep token validation)
// @route   GET /api/otp/validate-reset-token/:resetToken
// @access  Public
const validateResetToken = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;

    // Hash the token from params
    const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Find user by hashed token and check if token is still valid
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    res.status(200).json({
        success: true,
        message: 'Valid reset token',
        email: user.email
    });
});

module.exports = {
    forgotPassword,
    verifyOTP,
    resetPasswordWithOTP,
    resendOTP,

    validateResetToken
};