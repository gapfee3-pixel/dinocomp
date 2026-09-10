require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const linksRouter = require('./routes/links');
const authRouter = require('./routes/auth');
const allowedEmailsRouter = require('./routes/allowedEmails');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error('ไม่พบ MONGODB_URI กรุณาตั้งค่า Environment Variable ก่อนรันเซิร์ฟเวอร์');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('ไม่พบ JWT_SECRET กรุณาตั้งค่า Environment Variable ก่อนรันเซิร์ฟเวอร์ (ห้าม hard-code ในโค้ด)');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// เสิร์ฟไฟล์หน้าเว็บ (frontend) จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// API สำหรับ Login / Logout / ตรวจสอบผู้ใช้ปัจจุบัน
app.use('/api/auth', authRouter);

// API สำหรับ admin จัดการ Email Whitelist (เพิ่ม/ลบ/ระงับ/เปิดใช้งาน)
app.use('/api/admin/allowed-emails', allowedEmailsRouter);

// API สำหรับจัดการรายการลิงก์โปรแกรม
app.use('/api/links', linksRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, dbState: mongoose.connection.readyState });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('เชื่อมต่อ MongoDB สำเร็จ');
    app.listen(PORT, () => {
      console.log(`เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('เชื่อมต่อ MongoDB ล้มเหลว:', err.message);
    process.exit(1);
  });
