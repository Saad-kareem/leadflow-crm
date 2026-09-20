import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // `select: false` keeps the hash out of every query result by default, so a
    // careless `res.json(user)` cannot leak it.
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

userSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.model('User', userSchema);
