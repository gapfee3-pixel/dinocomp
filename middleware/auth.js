const jwt = require('jsonwebtoken');
const AllowedEmail = require('../models/AllowedEmail');

// ตรวจสอบว่ามี JWT ที่ถูกต้องแนบมาหรือไม่ (Header: Authorization: Bearer <token>)
// และตรวจ Email Whitelist ซ้ำทุกครั้งที่เรียก API (ไม่ใช่แค่ตอน Login)
// เพื่อให้ถ้า admin ระงับ/ลบ Email ระหว่างที่ยัง Login ค้างอยู่ ผู้ใช้จะหลุดสิทธิ์ทันทีในคำขอถัดไป
// ไม่ผ่าน -> ตอบ 401
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const allowedEntry = await AllowedEmail.findOne({ email: payload.email });
    if (!allowedEntry || allowedEntry.status !== 'allowed') {
      return res.status(403).json({ error: 'อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน' });
    }

    req.user = { id: payload.id, username: payload.username, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }
}

// ต้องเรียกต่อจาก requireAuth เสมอ (ต้องมี req.user อยู่แล้ว)
// ถ้า Login แล้วแต่ไม่ใช่ admin -> ตอบ 403
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้ (ต้องเป็นผู้ดูแลระบบ)' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
