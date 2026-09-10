# Dino Link Catalog — ระบบเก็บลิงก์โปรแกรม (Backend + Database + Login)

เว็บ "All Program Tools Advice" (Dino Com Advice วารินชำราบ) เวอร์ชันที่เก็บข้อมูลบนฐานข้อมูลกลาง
แทน localStorage — เปิดจากคอมพิวเตอร์หรือมือถือเครื่องไหนก็เห็นข้อมูลชุดเดียวกัน พร้อมระบบ Login
และสิทธิ์ผู้ใช้ 2 ระดับ (admin / user)

## โครงสร้างไฟล์ทั้งหมด

```
dino-link-catalog/
├── server.js              Express server หลัก: เชื่อม MongoDB + เสิร์ฟหน้าเว็บ + mount API
├── package.json            รายการ dependency และคำสั่งรันโปรเจกต์
├── .env.example             ตัวอย่างตัวแปรแวดล้อมที่ต้องตั้งค่า
├── .gitignore                กันไฟล์ node_modules / .env ไม่ให้ขึ้น git
├── models/
│   ├── Link.js               Schema ของ 1 รายการลิงก์โปรแกรม (Mongoose)
│   └── User.js                Schema ผู้ใช้: username, email, passwordHash (bcrypt), role
├── middleware/
│   └── auth.js                requireAuth (เช็ค JWT) และ requireAdmin (เช็ค role)
├── routes/
│   ├── auth.js                 API: POST /login, POST /logout, GET /me
│   └── links.js                API: GET / POST / PUT / DELETE ของ /api/links (เขียน/แก้/ลบ ต้อง login เป็น admin)
├── scripts/
│   └── seedAdmin.js            สคริปต์สร้าง Admin คนแรกจาก Environment Variables
└── public/
    └── index.html            หน้าเว็บ (frontend): มีหน้า Login และซ่อน/แสดงปุ่มจัดการตาม role
```

**สถาปัตยกรรม:** เป็น Node.js service ตัวเดียวที่ทำ 2 หน้าที่พร้อมกัน — เสิร์ฟไฟล์หน้าเว็บ (`public/index.html`)
และเปิด API (`/api/links`, `/api/auth`) ให้หน้าเว็บนั้นเรียกใช้ ดังนั้น deploy ขึ้น Render แค่ "1 service"
ก็ครบทั้ง frontend + backend ไม่ต้องแยก 2 ที่ และไม่มีปัญหาเรื่อง CORS เพราะเรียกจาก origin เดียวกัน

## ระบบ Login และสิทธิ์ผู้ใช้

- Login ด้วย **Email** + Password ผ่าน `POST /api/auth/login` — ได้ JWT กลับมา
- **Email Whitelist**: เว็บนี้ไม่มีระบบสมัครสมาชิกเอง ต้องเป็น admin เท่านั้นที่เพิ่ม Email เข้า Whitelist ได้
  ถ้า Email ไม่อยู่ใน Whitelist (หรือถูกระงับ) จะ Login ไม่ได้ ไม่ว่า Password จะถูกหรือไม่ก็ตาม —
  ระบบตรวจสอบที่ Backend ทุกครั้งทั้งตอน Login และตอนเรียก API อื่น ๆ ต่อจากนั้น (ไม่ได้ตรวจแค่ฝั่ง Frontend)
  ดังนั้นถ้า admin ระงับ Email ระหว่างที่มีคน login ค้างอยู่ คนนั้นจะหลุดสิทธิ์ทันทีในคำขอถัดไป
- Frontend เก็บ JWT ไว้ใน `localStorage` (เก็บเฉพาะ token สำหรับยืนยันตัวตน ไม่ใช่ข้อมูลรายการโปรแกรมหรือ Whitelist)
  แล้วแนบไปกับทุก request ที่ต้อง login ผ่าน header `Authorization: Bearer <token>`
- Token หมดอายุตาม `JWT_EXPIRES_IN` (ค่าเริ่มต้น 7 วัน)
- Password ทุกบัญชีถูก hash ด้วย bcrypt ก่อนเก็บ ไม่มีการเก็บ plain text และไม่ส่ง password/hash กลับใน API response ใด ๆ
- Role มี 2 แบบ: `admin` (เพิ่ม/แก้ไข/ลบ/ดู + จัดการ Email Whitelist) และ `user` (ดู/ค้นหา/เปิดลิงก์อย่างเดียว)
- API เพิ่ม/แก้ไข/ลบ ถูกป้องกันด้วย middleware สองชั้น: `requireAuth` (ไม่ได้ login → 401) และ `requireAdmin` (login แต่ไม่ใช่ admin → 403)

### จัดการ Email Whitelist (เฉพาะ admin)

Admin login แล้วกดปุ่ม **"จัดการ Email"** บนหน้าเว็บ จะเห็น panel สำหรับ:
1. เพิ่ม Email ใหม่เข้า Whitelist
2. ดูรายชื่อ Email ทั้งหมดพร้อมสถานะ (Allowed / Blocked)
3. กดปุ่ม "ระงับ" / "เปิดใช้งาน" เพื่อสลับสถานะ
4. กดปุ่ม "ลบ" เพื่อลบ Email ออกจาก Whitelist ทั้งหมด

### สร้าง Admin คนแรก

1. ใส่ค่าใน `.env`:
   ```
   ADMIN_USERNAME=admin
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=รหัสผ่านที่ปลอดภัย (อย่างน้อย 8 ตัวอักษร)
   ```
2. รันคำสั่ง:
   ```bash
   npm run seed:admin
   ```
3. สคริปต์จะสร้าง admin ให้ 1 ครั้ง และจะไม่สร้างซ้ำถ้ามี admin อยู่แล้วในระบบ — ใช้ปลอดภัยแม้รันซ้ำโดยไม่ตั้งใจ

## API ที่มีให้

| Method | Endpoint            | สิทธิ์ที่ต้องมี            | ทำอะไร                          |
|--------|---------------------|----------------------------|----------------------------------|
| POST   | `/api/auth/login`    | ไม่ต้อง login (แต่ต้องมี Email อยู่ใน Whitelist) | เข้าสู่ระบบ รับ JWT กลับมา       |
| POST   | `/api/auth/logout`   | ต้อง login                  | ออกจากระบบ (ฝั่ง client ลบ token) |
| GET    | `/api/auth/me`       | ต้อง login                  | ดูข้อมูลผู้ใช้ปัจจุบันจาก token   |
| GET    | `/api/links`         | ไม่ต้อง login (ดูอย่างเดียว) | ดึงรายการลิงก์ทั้งหมด            |
| POST   | `/api/links`         | ต้อง login + role admin     | เพิ่มรายการใหม่                  |
| PUT    | `/api/links/:id`     | ต้อง login + role admin     | แก้ไขรายการตาม id                |
| DELETE | `/api/links/:id`     | ต้อง login + role admin     | ลบรายการตาม id                   |
| GET    | `/api/admin/allowed-emails`      | ต้อง login + role admin | ดูรายชื่อ Email ใน Whitelist ทั้งหมด |
| POST   | `/api/admin/allowed-emails`      | ต้อง login + role admin | เพิ่ม Email ใหม่เข้า Whitelist (สถานะเริ่มต้น: allowed) |
| PATCH  | `/api/admin/allowed-emails/:id`  | ต้อง login + role admin | เปลี่ยนสถานะเป็น allowed หรือ blocked |
| DELETE | `/api/admin/allowed-emails/:id`  | ต้อง login + role admin | ลบ Email ออกจาก Whitelist |
| GET    | `/api/health`        | ไม่ต้อง login                | เช็คสถานะเซิร์ฟเวอร์ + database   |

ไม่ได้ login แล้วเรียก endpoint ที่ต้อง login → ตอบ `401`
Login แล้วแต่ไม่ใช่ admin แล้วเรียก endpoint ที่ต้อง admin → ตอบ `403`
Login ด้วย Email ที่ไม่อยู่ใน Whitelist (หรือถูกระงับ) → ตอบ `403` พร้อมข้อความ "อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน"

รูปแบบข้อมูล 1 รายการ (JSON):
```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "name": "Visual Studio Code",
  "time": "2026-09-10",
  "url": "https://code.visualstudio.com",
  "image": "https://example.com/vscode.png",
  "note": "โปรแกรมแก้ไขโค้ด"
}
```

---

## ขั้นตอนที่ 1 — สร้างฐานข้อมูล (MongoDB Atlas ฟรีตลอดชีพ)

ใช้ MongoDB Atlas เพราะมี Free tier (M0, 512MB) ที่**ไม่หมดอายุ** ต่างจาก Free Database ของ Render
ที่หมดอายุใน 30 วัน

1. ไปที่ https://www.mongodb.com/cloud/atlas/register แล้วสมัครบัญชีฟรี
2. สร้าง Project ใหม่ (ตั้งชื่ออะไรก็ได้ เช่น `dino-com-advice`)
3. กด **Build a Database** → เลือกแผน **M0 Free**
4. เลือก Cloud Provider/Region ใกล้ไทยที่สุด (เช่น AWS Singapore) แล้วกด Create
5. ตั้งค่า **Database Access**:
   - สร้าง Database User (username + password) — จดรหัสผ่านไว้ให้ดี
6. ตั้งค่า **Network Access**:
   - กด Add IP Address → เลือก **Allow Access from Anywhere** (`0.0.0.0/0`)
     (จำเป็นเพราะ Render ใช้ IP ไม่คงที่ในแผนฟรี)
7. กลับไปหน้า Database → กด **Connect** → เลือก **Drivers** → คัดลอก Connection String ที่ได้
   จะมีหน้าตาแบบนี้:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
   ```
8. แทนที่ `<username>` และ `<password>` ด้วยของจริง แล้วเติมชื่อฐานข้อมูลต่อท้ายโดเมน เช่น:
   ```
   mongodb+srv://dinoadmin:mypassword123@cluster0.xxxxx.mongodb.net/dino-link-catalog?retryWrites=true&w=majority
   ```
   นี่คือค่า `MONGODB_URI` ที่จะใช้ในขั้นตอนถัดไป

---

## ขั้นตอนที่ 2 — ทดสอบรันบนเครื่องตัวเอง (ไม่บังคับ แต่แนะนำ)

ต้องมี Node.js ติดตั้งไว้ก่อน (เวอร์ชัน 18 ขึ้นไป)

```bash
cd dino-link-catalog
npm install
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วใส่ `MONGODB_URI` ที่ได้จากขั้นตอนที่ 1 พร้อมตั้งค่า `JWT_SECRET` เป็นค่าสุ่มยาว ๆ
(สร้างได้ด้วย `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
และตั้งค่า `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` สำหรับสร้าง admin คนแรก

```bash
npm run seed:admin
npm start
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` ควรเห็นหน้าเว็บและสามารถเพิ่ม/แก้ไข/ลบรายการได้ปกติ

---

## ขั้นตอนที่ 3 — เตรียมโค้ดขึ้น GitHub

Render ดึงโค้ดจาก Git repository ดังนั้นต้อง push โปรเจกต์นี้ขึ้น GitHub ก่อน

```bash
cd dino-link-catalog
git init
git add .
git commit -m "Initial commit: dino link catalog"
```

จากนั้นสร้าง repository ใหม่บน https://github.com/new (ตั้งเป็น Private หรือ Public ก็ได้)
แล้วรันคำสั่งที่ GitHub แสดงให้ (ประมาณนี้):

```bash
git remote add origin https://github.com/<username>/dino-link-catalog.git
git branch -M main
git push -u origin main
```

---

## ขั้นตอนที่ 4 — Deploy บน Render (Free tier)

1. ไปที่ https://render.com แล้วสมัคร/เข้าสู่ระบบ (สมัครด้วย GitHub จะเชื่อม repo ได้ง่ายกว่า)
2. กด **New +** → เลือก **Web Service**
3. เลือก repository `dino-link-catalog` ที่เพิ่ง push ขึ้นไป
4. ตั้งค่าดังนี้:
   - **Name**: `dino-link-catalog` (หรือชื่ออื่นที่ต้องการ — จะกลายเป็นส่วนหนึ่งของ URL)
   - **Region**: เลือกใกล้ไทย เช่น Singapore
   - **Branch**: `main`
   - **Root Directory**: เว้นว่างไว้ (โค้ดอยู่ที่ root ของ repo)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: เลือก **Free**
5. เลื่อนลงไปที่ **Environment Variables** → กด **Add Environment Variable** แล้วเพิ่มทีละตัว:
   - Key: `MONGODB_URI` — Value: connection string จากขั้นตอนที่ 1 (ใส่ให้ครบ ไม่ต้องมีเครื่องหมายคำพูดครอบ)
   - Key: `JWT_SECRET` — Value: ค่าสุ่มยาว ๆ ที่คาดเดาไม่ได้ (ห้ามใช้ค่าตัวอย่างใน `.env.example`)
   - Key: `JWT_EXPIRES_IN` — Value: `7d` (หรือระยะเวลาที่ต้องการ)
6. กด **Create Web Service**

Render จะเริ่ม build และ deploy ให้อัตโนมัติ ใช้เวลาประมาณ 2-5 นาที
เมื่อเสร็จจะได้ URL แบบ `https://dino-link-catalog.onrender.com` — เปิด URL นี้ได้จากทุกอุปกรณ์เลย

### สร้าง Admin คนแรกบน Render

Render ไม่มี terminal แบบ shell ให้ฟรีเสมอไป วิธีที่ง่ายที่สุดคือสร้าง admin จากเครื่องตัวเองแล้วให้ชี้ไปที่
database เดียวกับที่ deploy จริง (ใช้ `MONGODB_URI` เดียวกันใน `.env` บนเครื่อง แล้วรัน `npm run seed:admin`)
เพราะ script เชื่อมตรงไปที่ MongoDB Atlas ไม่ได้ผ่าน Render เลย

### ข้อควรรู้เกี่ยวกับ Free tier ของ Render

- เซิร์ฟเวอร์ฟรีจะ **หลับ (sleep)** อัตโนมัติหลังไม่มีคนใช้งานประมาณ 15 นาที
- เมื่อมีคนเข้าเว็บครั้งแรกหลังจากหลับ จะใช้เวลาปลุกเซิร์ฟเวอร์ประมาณ 30-50 วินาที
  (หน้าเว็บจะค้างโหลดสักครู่ ไม่ใช่ error)
- ถ้าอยากให้เซิร์ฟเวอร์ไม่หลับเลย ต้องอัปเกรดเป็นแผนเสียเงิน หรือใช้บริการ "ping" เว็บทุก ๆ 10-14 นาที
  จากภายนอก (เช่น UptimeRobot ฟรี) เพื่อกันไม่ให้หลับ

---

## ขั้นตอนที่ 5 — ทดสอบหลัง Deploy

1. เปิด URL ที่ได้จาก Render ด้วยคอมพิวเตอร์ → ลองกด "เพิ่มรายการ" ใส่ข้อมูลแล้วบันทึก
2. เปิด URL เดียวกันจากมือถือ (หรือรีเฟรชหน้าเว็บ) → ควรเห็นรายการที่เพิ่งเพิ่มไป
3. ลองแก้ไข/ลบรายการ แล้วรีเฟรชอีกรอบ → ข้อมูลต้องอัปเดตตรงกันทุกเครื่อง
4. ถ้าต้องการเช็คว่าเซิร์ฟเวอร์เชื่อมฐานข้อมูลอยู่ไหม เปิด `https://<your-app>.onrender.com/api/health`
   ควรเห็น `{"ok":true,"dbState":1}` (`dbState: 1` แปลว่าเชื่อมต่อฐานข้อมูลสำเร็จ)

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| หน้าเว็บขึ้น "โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ" | ยังไม่ได้ตั้งค่า `MONGODB_URI` หรือ ตั้งผิด | เช็ค Environment Variable บน Render อีกครั้ง |
| Deploy fail ที่ขั้นตอน build | ลืม commit ไฟล์ `package.json` | เช็คว่า push ไฟล์ครบทุกไฟล์ขึ้น GitHub แล้ว |
| เชื่อมฐานข้อมูลไม่ได้ (`MongooseServerSelectionError`) | ยังไม่ได้เปิด Network Access เป็น `0.0.0.0/0` ใน Atlas | กลับไปทำขั้นตอนที่ 1 ข้อ 6 |
| หน้าเว็บโหลดช้ามากตอนเปิดครั้งแรก | Free tier ของ Render กำลังปลุกเซิร์ฟเวอร์จากโหมดหลับ | รอ 30-50 วินาที ครั้งต่อไปจะเร็วขึ้นจนกว่าจะหลับอีกครั้ง |
