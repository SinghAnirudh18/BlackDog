const userRepo = require('../repositories/userRepo');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Update/sync wallet address
const setWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress is required' });
    }
    const user = await userRepo.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.walletAddress = walletAddress;
    await userRepo.save(user);
    return res.json({ success: true, message: 'Wallet updated', user: userRepo.sanitize(user) });
  } catch (error) {
    console.error('Set wallet error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, username, firstName, lastName, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await userRepo.findOne({
      $or: [{ email: email?.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = await userRepo.createUser({
      email,
      password,
      username,
      walletAddress,
      profile: { firstName, lastName },
    });

    // Generate token and return JSON for frontend
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userRepo.sanitize(user)
    });
    

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userRepo.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await userRepo.comparePassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token and return JSON for frontend
    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userRepo.sanitize(user)
    });
    

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await userRepo.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: userRepo.sanitize(user) }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout user (client-side token removal)
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  setWalletAddress
};