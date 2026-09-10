const mongoose = require('mongoose');

const allowedEmailSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    status: { type: String, enum: ['allowed', 'blocked'], default: 'allowed' }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('AllowedEmail', allowedEmailSchema);
