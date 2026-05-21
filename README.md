# Flexora V2 - Backend (SaaS Gym Management)

منصة متكاملة بنظام SaaS (Software as a Service) تتيح لمدير النظام إضافة وإدارة الجيمات والصالات الرياضية، وتتيح لكل جيم إدارة لاعبيه واشتراكاته وحساباته بمعزل تام عن الآخرين.

## الميزات الرئيسية (Features)
- **Multi-Tenant SaaS:** نظام مصمم لدعم عدد غير محدود من الجيمات بحساب واحد للمنصة.
- **Role-Based Access (RBAC):** صلاحيات متعددة (Platform-Owner, Gym-Owner, Coach, Receptionist).
- **Subscriptions & Billing:** دفع الاشتراكات، اختيار الباقات، وتجميد أو إيقاف اللاعبين.
- **QR Code Attendance:** نظام حضور وانصراف متكامل مبني على قراءة الـ QR Code الخاص بكل لاعب.
- **Financial Dashboards:** لوحات تحكم مالية منفصلة للجيم ولمدير المنصة مع تتبع الإيرادات والمصروفات.
- **Coach Earnings:** تتبع آلي لعدد اللاعبين (الـ Private) المسجلين مع الكابتن وحساب عمولته فوراً.

## التقنيات المستخدمة (Tech Stack)
- Node.js & Express.js
- Prisma ORM
- PostgreSQL (Supabase)
- JSON Web Tokens (JWT) & bcryptjs للمصادقة والحماية

## كيفية التشغيل (How to run locally)

1. **تحميل المشروع:**
   ```bash
   git clone https://github.com/ahmed1mohammd/BaackEnd_Flexora.git
   cd BaackEnd_Flexora
   ```

2. **تثبيت الحزم (Install Packages):**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة (Environment Variables):**
   يجب إنشاء ملف `.env` ووضع المتغيرات التالية:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
   JWT_SECRET="YOUR_SUPER_SECRET_KEY"
   JWT_EXPIRES_IN="90d"
   ```

4. **تحديث قاعدة البيانات (Prisma Generate):**
   ```bash
   npx prisma generate
   ```

5. **تشغيل السيرفر:**
   ```bash
   npm run dev
   ```

## التوثيق (API Documentation)
توجد نسخة من هيكل مسارات النظام بالكامل داخل المشروع، ويمكن استيرادها مباشرة إلى Postman لسهولة التعامل وربط الـ Frontend.

---
**تم التطوير بواسطة SnapTech**
