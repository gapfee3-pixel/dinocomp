// สคริปต์สำหรับสร้าง Admin คนแรกอย่างปลอดภัย
// วิธีใช้:
//   1. ตั้งค่า ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD (และ MONGODB_URI) ใน .env
//   2. รันคำสั่ง: npm run seed:admin
//
// สคริปต์จะไม่สร้าง admin ซ้ำถ้ามี admin อยู่แล้วในระบบ

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');

async function seed() {
  const { MONGODB_URI, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI) {
    console.error('ไม่พบ MONGODB_URI กรุณาตั้งค่าใน .env ก่อนรัน');
    process.exit(1);
  }
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('กรุณาตั้งค่า ADMIN_USERNAME, ADMIN_EMAIL และ ADMIN_PASSWORD ใน .env ก่อนรัน seed script');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error('ADMIN_PASSWORD ควรมีความยาวอย่างน้อย 8 ตัวอักษร เพื่อความปลอดภัย');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('เชื่อมต่อ MongoDB สำเร็จ');

  const adminEmail = ADMIN_EMAIL.toLowerCase();

  async function ensureWhitelisted(email) {
    const existing = await AllowedEmail.findOne({ email });
    if (existing) {
      console.log(`Email ${email} มีอยู่ใน Whitelist แล้ว (สถานะปัจจุบัน: ${existing.status})`);
      return;
    }
    await AllowedEmail.create({ email, status: 'allowed' });
    console.log(`เพิ่ม ${email} เข้า Email Whitelist แล้ว (สถานะ: allowed)`);
  }

  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`มี Admin อยู่แล้วในระบบ (${existingAdmin.username}) — ข้ามการสร้างใหม่เพื่อความปลอดภัย`);
      // ยังตรวจสอบให้แน่ใจว่า email ที่ระบุใน .env ตอนนี้อยู่ใน whitelist
      // (เผื่อกรณีเพิ่งเปิดใช้ระบบ whitelist กับโปรเจกต์ที่มี admin อยู่ก่อนแล้ว)
      await ensureWhitelisted(adminEmail);
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ username: ADMIN_USERNAME }, { email: adminEmail }]
    });
    if (existingUser) {
      console.error('มี Username หรือ Email นี้อยู่แล้วในระบบ (แต่ไม่ใช่ admin) กรุณาเปลี่ยนค่าใน .env แล้วลองใหม่');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = await User.create({
      username: ADMIN_USERNAME,
      email: adminEmail,
      passwordHash,
      role: 'admin'
    });

    // เพิ่ม email ของ admin คนแรกเข้า Whitelist อัตโนมัติ ไม่งั้นจะ Login เข้าเว็บเองไม่ได้เลย
    await ensureWhitelisted(adminEmail);

    console.log(`สร้าง Admin สำเร็จ: ${admin.username} (${admin.email})`);
    console.log('แนะนำให้ลบหรือเปลี่ยนค่า ADMIN_PASSWORD ใน .env หลังสร้างเสร็จแล้ว');
  } finally {
    await mongoose.disconnect();
  }
}

seed()
  .then(() => process.exit(process.exitCode || 0))
  .catch((err) => {
    console.error('สร้าง Admin ไม่สำเร็จ:', err.message);
    process.exit(1);
  });
