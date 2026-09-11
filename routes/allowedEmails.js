const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const AllowedEmail = require('../models/AllowedEmail');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ทุก endpoint ในไฟล์นี้ต้อง login และต้องเป็น admin เท่านั้น
router.use(requireAuth, requireAdmin);

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim());
}

function isValidPassword(str) {
  return typeof str === 'string' && str.length >= 8;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role
  };
}

// GET /api/admin/allowed-emails - ดูรายชื่อ Email พร้อมสถานะบัญชีผู้ใช้
router.get('/', async (req, res) => {
  try {
    const list = await AllowedEmail.find().sort({ createdAt: -1 }).lean();
    const emails = list.map(x => x.email);
    const users = await User.find({ email: { $in: emails } }).select('username email role').lean();
    const userMap = new Map(users.map(u => [u.email, u]));

    res.json(list.map(entry => ({
      ...entry,
      id: entry._id.toString(),
      _id: undefined,
      user: publicUser(userMap.get(entry.email))
    })));
  } catch (err) {
    res.status(500).json({ error: 'โหลดรายชื่อ Email ไม่สำเร็จ' });
  }
});

// POST /api/admin/allowed-emails
// เพิ่ม Email + สร้างบัญชีผู้ใช้พร้อม Password ในครั้งเดียว
router.post('/', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const requestedRole = String(req.body.role || 'user').trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'กรุณาใส่ Email ที่ถูกต้อง' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 8 ตัวอักษร' });
    }
    if (!['user', 'admin'].includes(requestedRole)) {
      return res.status(400).json({ error: 'สิทธิ์ต้องเป็น user หรือ admin เท่านั้น' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email นี้มีบัญชีผู้ใช้อยู่แล้ว' });
    }

    let entry = await AllowedEmail.findOne({ email });
    if (entry && entry.status !== 'allowed') {
      entry.status = 'allowed';
      await entry.save();
    }
    if (!entry) {
      entry = await AllowedEmail.create({ email, status: 'allowed' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({
        // ใช้ Email เป็น username สำหรับบัญชีที่สร้างจากหน้า Admin เพื่อไม่ต้องกรอก username เพิ่ม
        username: email,
        email,
        passwordHash,
        role: requestedRole
      });
    } catch (err) {
      // ถ้าสร้าง User ไม่สำเร็จและเราเพิ่งสร้าง whitelist รายการนี้ ให้ล้างรายการที่สร้างไว้ด้วย
      if (!entry.user && err.code !== 11000) {
        await AllowedEmail.findByIdAndDelete(entry._id).catch(() => {});
      }
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Email หรือ Username นี้มีบัญชีอยู่แล้ว' });
      }
      throw err;
    }

    res.status(201).json({
      id: entry._id.toString(),
      email: entry.email,
      status: entry.status,
      user: publicUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: 'สร้างบัญชีผู้ใช้ไม่สำเร็จ' });
  }
});

// PATCH /api/admin/allowed-emails/:id - เปิดใช้งาน / ระงับ Email
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['allowed', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'สถานะต้องเป็น allowed หรือ blocked เท่านั้น' });
    }

    const updated = await AllowedEmail.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'ไม่พบ Email นี้ใน Whitelist' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตสถานะไม่สำเร็จ' });
  }
});

// PATCH /api/admin/allowed-emails/:id/password - ตั้ง/เปลี่ยน Password ของบัญชีนี้
router.patch('/:id/password', async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 8 ตัวอักษร' });
    }

    const entry = await AllowedEmail.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'ไม่พบ Email นี้ใน Whitelist' });

    const user = await User.findOne({ email: entry.email });
    if (!user) {
      return res.status(404).json({ error: 'Email นี้ยังไม่มีบัญชีผู้ใช้' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    res.json({ success: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'เปลี่ยน Password ไม่สำเร็จ' });
  }
});

// DELETE /api/admin/allowed-emails/:id - ลบ Email ออกจาก Whitelist
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await AllowedEmail.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'ไม่พบ Email นี้ใน Whitelist' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'ลบ Email ไม่สำเร็จ' });
  }
});

module.exports = router;
