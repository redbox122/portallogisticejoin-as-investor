# ربط التطبيق بسيرفرك / Connect to Your Server

## الخطوات

1. **انسخ ملف البيئة**
   - انسخ `.env.example` إلى `.env` (أو `.env.local`):
   ```bash
   copy .env.example .env
   ```
   - على Linux/Mac: `cp .env.example .env`

2. **عدّل عنوان السيرفر في `.env`**
   ```env
   REACT_APP_API_BASE_URL=https://your-api.com/api/v1
   REACT_APP_API_ORIGIN=https://your-api.com
   ```
   - استبدل `your-api.com` بعنوان سيرفر الـ API الفعلي.
   - إذا السيرفر محلياً مثلاً: `http://localhost:8000/api/v1` و `http://localhost:8000`.

3. **أعد تشغيل التطبيق**
   ```bash
   npm start
   ```
   - متغيرات البيئة تُقرأ عند بدء التشغيل فقط، لذلك يجب إعادة التشغيل بعد أي تعديل على `.env`.

## القيم الافتراضية

إذا لم يُنشأ ملف `.env` أو لم تُعرّف المتغيرات، التطبيق يستخدم:
- `REACT_APP_API_BASE_URL` = `https://shellafood.com/api/v1`
- `REACT_APP_API_ORIGIN` = `https://shellafood.com`

## ملاحظات

- تأكد أن سيرفر الـ API يسمح بـ **CORS** من أصل الواجهة (مثلاً `http://localhost:3000` عند التطوير).
- ملف `.env` لا يُرفع عادةً إلى Git (يُضاف إلى `.gitignore`)؛ لكل بيئة (تطوير/ستايجنغ/إنتاج) استخدم القيم المناسبة.
