const { body, validationResult } = require('express-validator');

const { ethers } = require('ethers');

// NFT verification validation
const nftVerificationValidation = [
  body('contractAddress')
    .notEmpty()
    .withMessage('Contract address is required')
    .custom((value) => {
      if (!ethers.utils.isAddress(value)) {
        throw new Error('Invalid contract address');
      }
      return true;
    }),
  body('tokenId')
    .notEmpty()
    .withMessage('Token ID is required')
    .isInt({ min: 0 })
    .withMessage('Token ID must be a positive integer')
];

const quickVerifyValidation = [
  body('contractAddress')
    .notEmpty()
    .withMessage('Contract address is required')
    .custom((value) => {
      if (!ethers.utils.isAddress(value)) {
        throw new Error('Invalid contract address');
      }
      return true;
    }),
  body('tokenId')
    .notEmpty()
    .withMessage('Token ID is required')
    .isInt({ min: 0 })
    .withMessage('Token ID must be a positive integer'),
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .custom((value) => {
      if (!ethers.utils.isAddress(value)) {
        throw new Error('Invalid wallet address');
      }
      return true;
    })
];
// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,nftVerificationValidation,
  quickVerifyValidation,
  handleValidationErrors
};