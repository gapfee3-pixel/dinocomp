const express = require('express');
const router = express.Router();
const AllowedEmail = require('../models/AllowedEmail');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ทุก endpoint ในไฟล์นี้ต้อง login และต้องเป็น admin เท่านั้น
router.use(requireAuth, requireAdmin);

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim());
}

// GET /api/admin/allowed-emails - ดูรายชื่อ Email ที่อนุญาตทั้งหมด
router.get('/', async (req, res) => {
  try {
    const list = await AllowedEmail.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'โหลดรายชื่อ Email ไม่สำเร็จ' });
  }
});

// POST /api/admin/allowed-emails - เพิ่ม Email ใหม่เข้า Whitelist
router.post('/', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'กรุณาใส่ Email ที่ถูกต้อง' });
    }

    const existing = await AllowedEmail.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email นี้อยู่ใน Whitelist อยู่แล้ว' });
    }

    const entry = await AllowedEmail.create({ email, status: 'allowed' });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email นี้อยู่ใน Whitelist อยู่แล้ว' });
    }
    res.status(500).json({ error: 'เพิ่ม Email ไม่สำเร็จ' });
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
