const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function validatePayload(body) {
  const { name, time, url } = body;
  if (!name || !String(name).trim()) return 'กรุณาใส่ชื่อโปรแกรม';
  if (!time) return 'กรุณาเลือกวันที่';
  if (!url || !isValidUrl(url)) return 'กรุณาใส่ลิงก์ที่ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https://)';
  return null;
}

// GET /api/links - ดึงรายการทั้งหมด
router.get('/', async (req, res) => {
  try {
    const links = await Link.find().sort({ time: -1, createdAt: -1 });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: 'โหลดข้อมูลไม่สำเร็จ' });
  }
});

// POST /api/links - เพิ่มรายการใหม่ (เฉพาะ admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const errorMsg = validatePayload(req.body);
  if (errorMsg) return res.status(400).json({ error: errorMsg });

  try {
    const { name, time, url, image, note } = req.body;
    const link = await Link.create({
      name: name.trim(),
      time,
      url: url.trim(),
      image: (image || '').trim(),
      note: (note || '').trim()
    });
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: 'บันทึกไม่สำเร็จ' });
  }
});

// PUT /api/links/:id - แก้ไขรายการ (เฉพาะ admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const errorMsg = validatePayload(req.body);
  if (errorMsg) return res.status(400).json({ error: errorMsg });

  try {
    const { name, time, url, image, note } = req.body;
    const updated = await Link.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        time,
        url: url.trim(),
        image: (image || '').trim(),
        note: (note || '').trim()
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'ไม่พบรายการนี้' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตไม่สำเร็จ' });
  }
});

// DELETE /api/links/:id - ลบรายการ (เฉพาะ admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Link.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'ไม่พบรายการนี้' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'ลบไม่สำเร็จ' });
  }
});

module.exports = router;
