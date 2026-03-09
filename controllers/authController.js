const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @desc    Register user & company
// @route   POST /api/auth/register
// @desc    Register user & company
// @route   POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        taxId,
        companyName,
        address,
        directorName,
        directorEmail,
        number,
        kybDocs
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Check if company exists
    const companyExists = await Company.findOne({ taxId });
    if (companyExists) {
        res.status(400);
        throw new Error('Company already registered');
    }

    // Create company with ALL fields
    const company = await Company.create({
        taxId,
        name: companyName,
        email: email,
        phone: number || '',
        address: address || 'Douala',
        directorName: directorName || name,
        directorEmail: directorEmail || email,
        status: 'PENDING',
        kybDocs: kybDocs || [],
        website: '',
        description: '',
        yearEstablished: null,
        avatar: '',
    });

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role: 'REGISTERED_COMPANY',
        company: company._id,
        number: number || '',
    });

    // Populate company data
    const populatedUser = await User.findById(user._id).populate('company');

    const token = generateToken(user._id);

    res.status(201).json({
        user: {
            _id: populatedUser._id,
            name: populatedUser.name,
            email: populatedUser.email,
            role: populatedUser.role,
            number: populatedUser.number,
        },
        company: populatedUser.company,
        token,
        isAuthenticated: true,
    });
});
// @desc    Login user
// @route   POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).populate('company');

    if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const token = generateToken(user._id);

    res.json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        company: user.company,
        token,
        isAuthenticated: true,
    });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: 'company',
        model: 'Company',
        // Select all company fields
        select: 'name taxId email phone address directorName directorEmail status website description yearEstablished avatar kybDocs createdAt updatedAt'
    });

    res.json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            number: user.number,
        },
        company: user.company,
        isAuthenticated: true,
    });
});
// @desc    Create super admin (one-time setup)
// @route   POST /api/auth/create-super-admin
// @access  Public (but should be protected with secret key)
const createSuperAdmin = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;



    // Check if any super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'SUPER_ADMIN', email: email });

    if (existingSuperAdmin) {
        res.status(400);

        throw new Error('Super admin already exists');
    }

    // Check if user with this email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create super admin (no company associated)
    const user = await User.create({
        name,
        email,
        password,
        role: 'SUPER_ADMIN',
        company: null // Super admins don't belong to a company
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        company: null,
        token,
        isAuthenticated: true,
        message: 'Super admin created successfully'
    });
});


// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Company owner or Super Admin)
const updateCompany = asyncHandler(async (req, res) => {
    const {
        name,
        phone,
        address,
        directorName,
        directorEmail,
        website,
        description,
        yearEstablished,
        avatar
    } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // const isCompanyOwner = req.user.company && 
    //                       (req.user.company._id.toString() === req.params.id || 
    //                        req.user.company.toString() === req.params.id);

    // if ( !isCompanyOwner) {
    //     console.log('Authorization failed:', {
    //         userRole: req.user.role,
    //         userCompany: req.user.company,
    //         targetCompanyId: req.params.id,
    //         isSuperAdmin,
    //         isCompanyOwner
    //     });
    //     res.status(403);
    //     throw new Error('Not authorized to update this company');
    // }

    // Update fields if provided
    if (name) company.name = name;
    if (phone) company.phone = phone;
    if (address) company.address = address;
    if (directorName) company.directorName = directorName;
    if (directorEmail) company.directorEmail = directorEmail;
    if (website) company.website = website;
    if (description) company.description = description;
    if (yearEstablished) company.yearEstablished = yearEstablished;
    if (avatar) company.avatar = avatar;

    await company.save();

    res.json({
        message: 'Company updated successfully',
        company
    });
});

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, userid } = req.body;

    const user = await User.findById(userid);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        res.status(401);
        throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
        message: 'Password changed successfully'
    });
});


const updateAdmin = asyncHandler(async (req, res) => {
    const { name, email, number, avatar } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if user is an admin (optional - you can remove this if you want to allow updating any user)
    if (user.role !== 'SUPER_ADMIN') {
        res.status(400);
        throw new Error('This route is only for updating admin users');
    }

    // Authorization check - only allow:
    // 1. Users to update their own profile, OR
    // 2. Super admins to update any admin
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== req.params.id) {
        res.status(403);
        throw new Error('Not authorized to update this user');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            res.status(400);
            throw new Error('Email already in use');
        }
    }

    // Update fields if provided
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (number !== undefined) updates.number = number;
    if (avatar) updates.avatar = avatar;

    // Apply updates
    Object.assign(user, updates);
    await user.save();

    // Return updated user (excluding password)
    res.json({
        success: true,
        message: 'Admin profile updated successfully',
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            number: user.number,
            avatar: user.avatar,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }
    });
});



const getAdmins = asyncHandler(async (req, res) => {
    const admins = await User.find({ role: 'SUPER_ADMIN' })
        .select('-password')
        .sort('-createdAt');

    res.json({
        success: true,
        count: admins.length,
        admins
    });
});

// @desc    Get single admin by ID
// @route   GET /api/users/admins/:id
// @access  Private/SuperAdmin
const getAdminById = asyncHandler(async (req, res) => {
    const admin = await User.findOne({
        _id: req.params.id,
        role: 'SUPER_ADMIN'
    }).select('-password');

    if (!admin) {
        res.status(404);
        throw new Error('Admin not found');
    }

    res.json({
        success: true,
        admin
    });
});


const deleteAdmin = asyncHandler(async (req, res) => {
    const admin = await User.findOne({
        _id: req.params.id,
        role: 'SUPER_ADMIN'
    });

    if (!admin) {
        res.status(404);
        throw new Error('Admin not found');
    }

    // Prevent deleting the last super admin
    const adminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
    if (adminCount <= 1) {
        res.status(400);
        throw new Error('Cannot delete the last super admin');
    }

    await admin.deleteOne();

    res.json({
        success: true,
        message: 'Admin deleted successfully'
    });
});
module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    createSuperAdmin,
    updateCompany,
    changePassword,
    updateAdmin,
    getAdmins,
    getAdminById,
    deleteAdmin,
};