const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    time: { type: String, required: true }, // เก็บเป็น 'YYYY-MM-DD' ตรงกับ <input type="date">
    url: { type: String, required: true, trim: true },
    image: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
    category: { type: String, default: 'ทั่วไป', trim: true },
    style: {
      fontFamily: { type: String, default: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif' },
      nameFontSize: { type: Number, default: 19, min: 10, max: 60 },
      nameFontWeight: { type: String, default: '600' },
      nameFontStyle: { type: String, default: 'normal' },
      nameColor: { type: String, default: '#111111' },
      noteFontSize: { type: Number, default: 14, min: 10, max: 40 },
      noteFontWeight: { type: String, default: '400' },
      noteFontStyle: { type: String, default: 'normal' },
      noteColor: { type: String, default: '#6e6e73' },
      cardBgColor: { type: String, default: '#ffffff' },
      imageShape: { type: String, enum: ['square','landscape','portrait'], default: 'landscape' },
      imageFit: { type: String, enum: ['cover','contain'], default: 'cover' },
      imageHeight: { type: Number, default: 160, min: 80, max: 500 },
      imageRadius: { type: Number, default: 0, min: 0, max: 40 },
      imageBorder: { type: Boolean, default: false }
    }
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
