const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');

// Public routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

// Protected routes
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

module.exports = router;