const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    time: { type: String, required: true }, // เก็บเป็น 'YYYY-MM-DD' ตรงกับ <input type="date">
    url: { type: String, required: true, trim: true },
    image: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true }
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

module.exports = mongoose.model('Link', linkSchema);
