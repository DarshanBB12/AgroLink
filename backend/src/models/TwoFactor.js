const mongoose = require('mongoose');
const crypto = require('crypto');

const twoFactorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  method: {
    type: String,
    enum: ['email', 'sms', 'authenticator'],
    default: 'email'
  },
  secret: String, // For authenticator apps
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  phone: String,
  lastVerified: Date,
  verificationAttempts: {
    type: Number,
    default: 0
  },
  blockedUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Generate backup codes
twoFactorSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    });
  }
  this.backupCodes = codes;
  return codes;
};

// Verify backup code
twoFactorSchema.methods.verifyBackupCode = function(code) {
  const backupCode = this.backupCodes.find(bc => bc.code === code && !bc.used);
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  return false;
};

// Check if account is locked due to failed attempts
twoFactorSchema.methods.isLocked = function() {
  if (this.blockedUntil) {
    if (this.blockedUntil > new Date()) {
      return true;
    } else {
      this.blockedUntil = null;
      this.verificationAttempts = 0;
    }
  }
  return false;
};

// Increment failed verification attempts
twoFactorSchema.methods.incrementFailedAttempts = function() {
  this.verificationAttempts += 1;
  
  // Lock account after 5 failed attempts for 15 minutes
  if (this.verificationAttempts >= 5) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 15);
    this.blockedUntil = lockUntil;
  }
};

// Reset verification attempts
twoFactorSchema.methods.resetFailedAttempts = function() {
  this.verificationAttempts = 0;
  this.blockedUntil = null;
  this.lastVerified = new Date();
};

module.exports = mongoose.model('TwoFactor', twoFactorSchema);
