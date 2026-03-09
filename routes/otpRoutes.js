const express = require('express');
const router = express.Router();
const {
    forgotPassword,
    verifyOTP,
    resetPasswordWithOTP,
    resendOTP,
    validateResetToken
} = require('../controllers/OTPcontroller');

// Public OTP routes (no authentication required)
router.post('/forgot-password', forgotPassword);           // Request OTP
router.post('/verify-otp', verifyOTP);                     // Verify OTP
router.post('/reset-password', resetPasswordWithOTP);      // Reset with OTP
router.post('/resend-otp', resendOTP);                     // Resend OTP
router.get('/validate-reset-token/:resetToken', validateResetToken); // Validate token (optional)

module.exports = router;