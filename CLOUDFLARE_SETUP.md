# تشغيل الموقع على Cloudflare Pages

تم تجهيز هذا المشروع بالكامل ليعمل على **Cloudflare Pages** مع ميزات Full-Stack (الواجهة الثابتة CDN + وظائف الـ API عبر Pages Functions).

---

## 1. الطريقة الأولى: الربط المباشر مع GitHub (موصى بها)

من لوحة تحكم Cloudflare:
1. اذهب إلى **Workers & Pages** ← اضغط **Create application** ← اختر تبويب **Pages**.
2. اختر **Connect to Git** وحدد مستودع المشروع (Repository).
3. اضبط إعدادات البناء (**Build configuration**):
   - **Framework preset:** `None`
   - **Build command:** `pnpm run build:cloudflare` (أو `npm run build:cloudflare`)
   - **Build output directory:** `artifacts/islamic-book-bundle/dist/public`
   - **Root directory:** اتركه فارغاً `/`
4. في قسم **Environment variables (Advanced)** أثناء الإنشاء:
   - `NODE_VERSION`: `20`
   - `PNPM_VERSION`: `10.11.1`
5. اضغط **Save and Deploy**.

---

## 2. إضافة المتغيرات والأسرار (Environment Variables & Secrets)

من لوحة تحكم المشروع في Cloudflare:
**Workers & Pages** ← اسم مشروعك ← **Settings** ← **Environment variables** (أو **Variables and Secrets**):

أضف القيم التالية لبيئة **Production** (ولبيئة **Preview** إذا أردت):

| المتغير | النوع | الوصف |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Secret** / Encrypted | رابط اتصال Supabase (**Transaction pooler** المنفذ `6543`) |
| `ADMIN_PASSWORD` | **Secret** / Encrypted | كلمة مرور الدخول للوحة تحكم المدير `/admin` |
| `SESSION_SECRET` | **Secret** / Encrypted | مفتاح تشفير الجلسات (سلسلة عشوائية لا تقل عن 32 حرفاً) |
| `TELEGRAM_BOT_TOKEN` | **Secret** / Encrypted | *(اختياري)* توكن بوت تيليجرام لإشعارات الطلبات |
| `TELEGRAM_CHAT_ID` | **Secret** / Encrypted | *(اختياري)* معرّف المحادثة أو القناة لاستقبال الطلبات |

> [!IMPORTANT]
> **رابط Supabase:** احرص على استخدام **Transaction pooler** (المنفذ `6543`) من لوحة Supabase (Project Settings → Database → Connection string → Transaction pooler).
> تم تعديل الكود ليعمل مباشرة مع `DATABASE_URL` بدون الحاجة الإجبارية لخدمة Hyperdrive المدفوعة.

---

## 3. إعدادات الدوال والتوافق (Functions & Compatibility)

ملف `wrangler.json` في المشروع مُعد مسبقاً بالإعدادات التالية، ويمكنك التأكد منها من:
**Settings** ← **Functions**:
- **Compatibility flag:** `nodejs_compat` و `enable_nodejs_http_server_modules`
- **Compatibility date:** `2024-11-01` أو أحدث.

---

## 4. ميزات تم إعدادها تلقائياً لتفادي أي مشاكل

1. **دعم التوجيه أحادي الصفحة (SPA Routing):**
   - تم إنشاء ملف `_redirects` بحيث إذا قام الزائر بفتح أو تحديث صفحة `/admin`، لا تظهر له رسالة الخطأ `404 Not Found`، بل تفتح الصفحة بسلاسة.
2. **توجيه الـ API المباشر (`_routes.json`):**
   - تم إنشاء ملف `_routes.json` لضمان توجيه مسارات `/api/*` فقط إلى Functions، بينما يتم تقديم جميع الصور والملفات الثابتة والأيقونات من شبكة Cloudflare CDN مباشرة وفائقة السرعة ومجاناً.
3. **توافق كامل مع Node.js في Worker:**
   - تم ضبط اتصال قاعدة البيانات وتشفير كلمات المرور (`scrypt`) وتوليد الجلسات لتعمل بتوافق كامل مع بيئة Cloudflare Pages Functions.

---

## 5. النشر اليدوي عبر موجه الأوامر (CLI)

إذا كنت تفضل رفع المشروع مباشرة من حاسوبك باستخدام Wrangler:
```bash
# بناء ونشر المشروع على Cloudflare Pages
pnpm run deploy:pages
```
أو عبر الأمر المباشر:
```bash
npx wrangler pages deploy ./artifacts/islamic-book-bundle/dist/public --project-name khira
```

---

## 6. فحص حالة الموقع بعد النشر

بعد اكتمال النشر، افتح الرابط التالي على موقعك:
`https://<your-project>.pages.dev/api/health`

- إذا كانت النتيجة `{"status":"ok"}`: فكل شيء يعمل بنجاح، والموقع متصل بقاعدة البيانات.
- إذا ظهر `MISSING_RUNTIME_CONFIGURATION`: تأكد من إضافة `DATABASE_URL` و `ADMIN_PASSWORD` و `SESSION_SECRET` في إعدادات المتغيرات.
