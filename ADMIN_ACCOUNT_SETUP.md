# إنشاء حساب مدير / Admin Account Setup

## ملخص
حساب المدير **لا يُنشأ من واجهة تسجيل الدخول**. يتم إنشاؤه من الباكند (قاعدة البيانات أو لوحة إدارة السيرفر).

---

## 1) من الباكند (Laravel مثالاً)

إذا كان الباكند Laravel وكان لديك وصول للسيرفر أو قاعدة البيانات:

### أ) من Tinker (أسرع)
```bash
php artisan tinker
```
```php
$admin = \App\Models\Admin::create([
    'name' => 'مدير النظام',
    'email' => 'info@shellafood.com',
    'password' => bcrypt('كلمة_المرور_التي_تختارها'),
]);
// أو إذا الجدول users مع role:
$user = \App\Models\User::create([...]);
$user->assignRole('admin');
```

### ب) من Seeder
أنشئ ملفاً مثل `database/seeders/AdminSeeder.php` ثم:
```bash
php artisan db:seed --class=AdminSeeder
```

### ج) من لوحة إدارة أخرى
إذا كان لديك لوحة إدارة (مثلاً Laravel Nova / Filament) فأنشئ المدير من هناك.

---

## 2) عبر API (إن وُجد على الباكند)

الفرونتند جاهز لاستدعاء API إنشاء مدير إذا فعّل الباكند الـ endpoint التالي.

### المطلوب من الباكند

| المعلومة | القيمة |
|----------|--------|
| Method   | `POST` |
| URL      | `https://shellafood.com/api/v1/portallogistice/admin/register` |
| Body     | `{ "email", "password", "name" }` |

**Request (مثال):**
```json
{
  "email": "info@shellafood.com",
  "password": "كلمة_مرور_قوية",
  "name": "مدير النظام"
}
```

**Response متوقع (نجاح):**
```json
{
  "success": true,
  "message": "تم إنشاء حساب المدير بنجاح",
  "data": {
    "admin": { "id": 1, "email": "...", "name": "..." }
  }
}
```

إذا لم يُفعّل هذا الـ endpoint بعد، استخدم الطريقة من الباكند (الفقرة 1).

---

## 3) خطأ "Network Error" عند تسجيل الدخول

- التأكد أن الـ API يعمل: `https://shellafood.com/api/v1/portallogistice/admin/login`
- إذا كنت تفتح الموقع من `127.0.0.1` أو `localhost`: قد يكون CORS يمنع الطلب؛ الباكند يجب أن يسمح بـ Origin الخاص بك.
- التأكد أن حساب المدير (البريد + كلمة المرور) موجود فعلاً في قاعدة البيانات كما في الفقرة 1.
