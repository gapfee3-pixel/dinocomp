const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const { requireAuth } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/login - ตรวจสอบ Username/Email + Password แล้วออก JWT
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'กรุณากรอก Username/Email และ Password' });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: String(identifier).toLowerCase() }]
    });

    // ใช้ข้อความ error แบบเดียวกันทั้งกรณีไม่พบ user และ password ผิด
    // เพื่อไม่ให้เดาได้ว่า username/email นี้มีอยู่ในระบบหรือไม่
    if (!user) {
      return res.status(401).json({ error: 'Username/Email หรือ Password ไม่ถูกต้อง' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Username/Email หรือ Password ไม่ถูกต้อง' });
    }

    // ตรวจสอบ Email Whitelist ที่ Backend เสมอ ห้ามพึ่งการตรวจที่ Frontend อย่างเดียว
    // ต้องมีรายการอยู่ใน Whitelist และสถานะเป็น 'allowed' เท่านั้นถึงจะ Login ผ่าน
    const allowedEntry = await AllowedEmail.findOne({ email: user.email });
    if (!allowedEntry || allowedEntry.status !== 'allowed') {
      return res.status(403).json({ error: 'อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
  }
});

// POST /api/auth/logout
// JWT เป็น stateless token, การ Logout จริง ๆ เกิดขึ้นที่ฝั่ง Client (ลบ token ที่เก็บไว้)
// Endpoint นี้มีไว้เพื่อความสมมาตรของ API และรองรับการทำ token blacklist ในอนาคตถ้าต้องการ
router.post('/logout', requireAuth, (req, res) => {
  res.json({ success: true });
});

// GET /api/auth/me - ใช้เช็คว่า token ที่ถืออยู่ยังใช้ได้ไหม และดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
