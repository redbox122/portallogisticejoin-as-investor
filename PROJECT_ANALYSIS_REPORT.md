# تقرير تحليل المشروع الكامل

## 1. هل يوجد Backend ضمن المشروع؟

**نعم** — يوجد باكند Laravel داخل المشروع:

| الموقع | التقنية | الحالة |
|--------|---------|--------|
| `tasheel-backend/` | **Laravel 13** (PHP 8.3) | موجود لكن **بدون API routes** |

- **المحتوى الحالي للباكند:**
  - `routes/web.php`: مسار واحد فقط `GET /` يرجع صفحة الترحيب.
  - **لا يوجد** `routes/api.php` — ولم يُسجَّل في `bootstrap/app.php` أي توجيه لملف API.
  - قاعدة البيانات: تم ضبطها على **MySQL** (قاعدة `tasheel`) بعد أن كانت SQLite.
- **الخلاصة:** الباكند **هيكلياً جاهز** (Laravel مثبت)، لكن **جميع endpoints التي يستخدمها الفرونتند غير مبنية** فيه. الفرونتند كان مصمماً للاتصال بـ API خارجي (shellafood.com).

---

## 2. هل يوجد routes أو endpoints معرفة مسبقاً؟

### في الباكند (tasheel-backend)

- **معرّف حاليًا:** مسار واحد فقط:
  - `GET /` → عرض صفحة الترحيب.
- **غير معرّف:** كل مسارات الـ API (مثل `/api/portallogistice/*`) — لا توجد في المشروع.

### في التوثيق والفرونتند

نعم — الـ endpoints **معرّفة في التوثيق وفي الكود** كمسارات يُفترض أن يوفّرها سيرفر خارجي (سابقاً shellafood.com):

| المصدر | الملف | ما يحتويه |
|--------|--------|------------|
| توثيق API | `APIS.MD` | شرح كامل لـ Base URL وكل الـ endpoints (تسجيل دخول، عقود، إشعارات، إدارة، إلخ). |
| توثيق Endpoints | `ENDPOINTS.md` | جدول endpoints مع Method و Auth ووصف وملف الفرونتند الذي يستخدمها. |
| توثيق آخر | `v2/API_REQUIREMENTS_FOR_FRONTEND.md` | متطلبات الـ API للفرونتند. |

كل هذه الـ routes **ليست مكتوبة في tasheel-backend**؛ هي مواصفات يتوقع الفرونتند أن يجدها على السيرفر (سابقاً shellafood.com، حالياً يمكن توجيهها إلى `http://127.0.0.1:8000/api` بعد بناء الـ API في الباكند).

---

## 3. هل توجد ملفات تحتوي على API calls حقيقية؟

**نعم** — الفرونتند مليء باستدعاءات API حقيقية (axios / fetch) إلى نفس الـ base URL:

| الفئة | الملفات (أمثلة) | نوع الاستدعاء |
|-------|------------------|----------------|
| **Auth** | `src/Context/AuthContext.js` | تسجيل دخول مستخدم/مدير، تسجيل خروج، إرسال OTP. |
| **Login + OTP** | `src/Pages/LoginPage.js` | تحقق OTP، إنشاء حساب مدير (إن وُجد endpoint). |
| **Header (عقود عامة)** | `src/Utitlities/Header.js` | إرسال OTP، تحقق OTP (عرض العقود). |
| **Dashboard مستخدم** | `OverviewPage`, `ContractsPage`, `ProfilePage`, `PaymentsPage`, `TasksPage`, `NotificationsPage`, `AnalyticsPage`, `ContractInfoPage` | profile, contracts, documents, payments, notifications, overview, account-details, upload, إلخ. |
| **Dashboard مدير** | `Admin/OverviewPage`, `DocumentsPage`, `ContractsPage`, `PaymentsPage`, `AnalyticsPage`, `StatisticsPage`, `SettingsPage`, `ActivityLogsPage`, `EmailTemplatesPage` | إحصائيات، عقود، مستندات، مدفوعات، إعدادات، قوالب بريد، إلخ. |
| **مكونات مشتركة** | `ContractForm`, `ProfileCompletionModal`, `ContractManagement`, `UserManagement`, `NotificationBell`, `DashboardLayout`, `DataComparisonModal`, `ActionRequiredCard`, إلخ. | عقود، نفاذ، مستندات، إشعارات، مستخدمين، إعدادات عقود. |
| **صفحة تساهيل** | `src/Pages/TsahelPage.js` | contract-pdf, register, nafath/initiate, nafath/checkStatus. |
| **Hooks** | `src/hooks/useContractEligibility.js` | contracts. |

**العنوان المستخدم:**  
جميع الاستدعاءات تذهب إلى:

- `API_BASE_URL` (من `src/config.js`) = من `.env`: `REACT_APP_API_BASE_URL` أو الافتراضي `https://shellafood.com/api/v1`.
- `API_ORIGIN` للملفات/الروابط = `REACT_APP_API_ORIGIN` أو `https://shellafood.com`.

أي أن كل الـ API calls **حقيقية** وتتوقع سيرفراً يعمل على الـ base URL الموجود في `.env` (حالياً يمكن أن يكون `http://127.0.0.1:8000/api` إذا شغّلت الباكند محلياً).

---

## 4. ما هو السيرفر الذي كان المشروع يعتمد عليه سابقاً؟

**السيرفر السابق (الافتراضي في الكود والتوثيق):**

- **Base URL للـ API:**  
  `https://shellafood.com/api/v1`
- **أصل الملفات/الروابط:**  
  `https://shellafood.com`

هذا مذكور في:

- `src/config.js` (قيم افتراضية).
- `APIS.MD` و `ENDPOINTS.md`.
- كان كل الفرونتند يصله عبر هذا الدومين قبل إضافة ربط بـ `.env`.

**حالياً (بعد التعديلات):**

- يمكن توجيه الفرونتند إلى أي سيرفر عبر `.env`، مثلاً الباكند المحلي:
  - `REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api`
  - `REACT_APP_API_ORIGIN=http://127.0.0.1:8000`

---

## 5. هل يوجد نظام Authentication جاهز؟

**نعم** — في الفرونتند نظام مصادقة جاهز ومتكامل:

| العنصر | الموقع | الوظيفة |
|--------|--------|---------|
| **Auth Context** | `src/Context/AuthContext.js` | تخزين حالة المستخدم/المدير، التوكن، نوع الحساب، دوال تسجيل الدخول/الخروج وفحص الجلسة. |
| **تخزين** | `localStorage` | `portal_logistics_token`, `portal_logistics_user`, `portal_logistics_admin`, `portal_logistics_user_type`. |
| **تسجيل دخول مستخدم** | `POST .../portallogistice/login` | Body: `login` (email/phone/national_id), `password`. |
| **تسجيل دخول مدير** | `POST .../portallogistice/admin/login` | Body: `email`, `password`. |
| **تسجيل خروج** | `POST .../portallogistice/logout` أو `.../admin/logout` | مع `Authorization: Bearer {token}`. |
| **أول دخول + OTP** | بعد نجاح Login، إذا `user.is_first_login`: استدعاء `send-otp` ثم واجهة إدخال OTP في `LoginPage.js`، ثم تحقق (يفترض endpoint verify-otp). |
| **حماية المسارات** | `src/Components/ProtectedRoute.js` | منع الدخول لصفحات المستخدم/المدير بدون تسجيل دخول، وتمييز مدير عن مستخدم. |
| **هيدر الطلبات** | `getAuthHeaders()` من AuthContext | إرجاع `Authorization: Bearer ...` و `Content-Type`, `Accept`, `X-LANG` لاستخدامها في كل الطلبات المحمية. |

**ملخص:**  
نظام الـ Authentication **منطقياً وجاهز في الفرونتند** (تسجيل دخول/خروج، توكن، OTP لأول دخول، حماية مسارات). لكنه **يعتمد بالكامل على API من السيرفر** (سابقاً shellafood.com، ويمكن أن يكون الآن الباكند المحلي إذا تم تنفيذ نفس الـ endpoints في tasheel-backend).

---

## ملخص سريع

| السؤال | الجواب |
|--------|--------|
| 1. Backend ضمن المشروع؟ | نعم — Laravel في `tasheel-backend/`، لكن **بدون أي API routes** (فقط صفحة ترحيب). |
| 2. Routes/Endpoints معرفة مسبقاً؟ | نعم في **التوثيق والفرونتند** (APIS.MD, ENDPOINTS.md)، **لا** في كود الباكند. |
| 3. ملفات فيها API calls حقيقية؟ | نعم — عشرات الملفات في `src/` تستخدم `API_BASE_URL` و `API_ORIGIN` لطلبات حقيقية. |
| 4. السيرفر السابق؟ | **https://shellafood.com** (API: `/api/v1`, أصل الملفات: نفس الدومين). |
| 5. نظام Authentication جاهز؟ | نعم في الفرونتند (AuthContext، تسجيل دخول/خروج، OTP، ProtectedRoute، Bearer token). |

**التوصية العملية:**  
لبناء نظام متكامل مع الباكند الحالي (`tasheel-backend`):

1. إضافة توجيه API في Laravel (مثلاً `routes/api.php` وتسجيله في `bootstrap/app.php`).
2. تنفيذ الـ endpoints المذكورة في `APIS.MD` / `ENDPOINTS.md` تحت مسار مثل `/api/portallogistice/...` (أو `/api/v1/portallogistice/...` حسب ما تضعه في `REACT_APP_API_BASE_URL`).
3. الإبقاء على `.env` في الفرونتند يشير إلى `http://127.0.0.1:8000/api` و `http://127.0.0.1:8000` أثناء التطوير المحلي.
