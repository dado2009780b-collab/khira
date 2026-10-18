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
6. من **Settings → Builds & deployments** تأكد أن **Build system** مضبوط على **Version 2**؛ ملف `wrangler.jsonc` يعتمد عليه لتطبيق إعدادات Pages Functions.

---

## 2. إضافة المتغيرات والأسرار (Environment Variables & Secrets)

من لوحة تحكم المشروع في Cloudflare:
**Workers & Pages** ← اسم مشروعك ← **Settings** ← **Environment variables** (أو **Variables and Secrets**):

أضف القيم التالية لبيئة **Production** (ولبيئة **Preview** إذا أردت):

| المتغير | النوع | الوصف |
| :--- | :--- | :--- |
| `HYPERDRIVE` | **Binding في `wrangler.jsonc`** | الربط الموصى به لاتصال Supabase المباشر. يضبط المشروع اسم binding ومعرّف Hyperdrive في ملف Wrangler، لا من لوحة Pages. |
| `DATABASE_URL` | **Secret** / Encrypted | بديل عن Hyperdrive: رابط Supabase **Transaction pooler** (المنفذ `6543`). |
| `ADMIN_PASSWORD` | **Secret** / Encrypted | كلمة مرور الدخول للوحة تحكم المدير `/admin` (12 حرفًا على الأقل) |
| `SESSION_SECRET` | **Secret** / Encrypted | مفتاح تشفير الجلسات (سلسلة عشوائية لا تقل عن 32 حرفاً) |
| `TELEGRAM_BOT_TOKEN` | **Secret** / Encrypted | *(اختياري)* توكن بوت تيليجرام لإشعارات الطلبات |
| `TELEGRAM_CHAT_ID` | **Secret** / Encrypted | *(اختياري)* معرّف المحادثة أو القناة لاستقبال الطلبات |

> [!IMPORTANT]
> **طريقة الاتصال الموصى بها لهذا المشروع:** أنشئ إعداد Hyperdrive في Cloudflare باستخدام اتصال Supabase المباشر، ثم أضف معرّفه ضمن `hyperdrive` في `wrangler.jsonc` باسم binding هو `HYPERDRIVE`. ملف Wrangler هو مصدر إعدادات Pages Functions؛ لذلك ستعرض لوحة Pages تنبيهًا بأن bindings تُدار عبر ملف Wrangler، وهذا متوقع. إذا لم تستخدم Hyperdrive، استخدم `DATABASE_URL` مع **Transaction pooler** (المنفذ `6543`)، وليس الاتصال المباشر.
>
> يضبط المشروع binding `HYPERDRIVE` ومعرّفه في `wrangler.jsonc`. تضبط أسرار `DATABASE_URL` و`ADMIN_PASSWORD` و`SESSION_SECRET` ضمن **Variables and Secrets** لكل بيئة مستخدمة. أعد النشر بعد تغيير الإعدادات.

> **إشعارات Telegram:** لإرسال إشعار بعد حفظ كل طلب، أضف `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` كـ **Secrets** في بيئة **Production** ضمن **Settings → Variables and Secrets**. ضع توكن البوت الذي أنشأته عبر BotFather ومعرّف المحادثة التي بدأ فيها البوت محادثةً معك. لا تضع هذه القيم في ملفات الواجهة أو في GitHub. بعد الحفظ، أعد النشر؛ ينتظر API نتيجة Telegram بعد حفظ الطلب، ويسجل فشل الإشعار دون إلغاء الطلب. للتحقق من إعداد Production نفسه، سجّل الدخول إلى لوحة الإدارة وافتح **تغيير كلمة المرور → فحص إشعارات Telegram**؛ سترسل الزر رسالة اختبار إلى المحادثة المضبوطة على الخادم وتعرض سببًا آمنًا عند الفشل.

---

## 3. إعداد مخطط قاعدة البيانات

قبل استخدام لوحة الإدارة، حدّث مخطط قاعدة البيانات ليطابق جداول المشروع. من مجلد المشروع المحلي، اضبط `DATABASE_URL` محليًا على قاعدة Supabase نفسها ثم شغّل:

```bash
pnpm --filter @workspace/db run push
```

هذا الأمر ينشئ الجداول والأعمدة المطلوبة ويحدّث المخطط الموجود. لا تشارك رابط الاتصال أو كلمة مرور قاعدة البيانات. بعد نجاحه، افحص `https://<your-project>.pages.dev/api/health`؛ يجب أن تكون النتيجة `{"status":"ok","database":"connected","requiredTables":"present"}`.

## 4. إعدادات الدوال والتوافق (Functions & Compatibility)

ملف `wrangler.jsonc` في جذر المشروع هو مصدر إعدادات Pages Functions. يتعامل API مع طلبات Pages عبر واجهة Fetch مباشرةً، ولا يحتاج إلى تشغيل خادم HTTP أو فتح منفذ داخل Pages. يكفي توافق `nodejs_compat` المطلوب لمكتبات Node.js المستخدمة.

إذا كان المشروع لا يستخدم ملف Wrangler كمصدر للإعدادات، اضبط يدويًا من **Settings → Functions → Compatibility flags**:
- **Compatibility date:** `2026-10-18` أو أحدث.
- **Compatibility flags:** `nodejs_compat`.

استخدم Build system V2 أو أحدث ليتم تطبيق إعدادات Wrangler على Pages Functions.

---

## 5. ميزات تم إعدادها تلقائياً لتفادي أي مشاكل

1. **دعم التوجيه أحادي الصفحة (SPA Routing):**
   - تم إنشاء ملف `_redirects` بحيث إذا قام الزائر بفتح أو تحديث صفحة `/admin`، لا تظهر له رسالة الخطأ `404 Not Found`، بل تفتح الصفحة بسلاسة.
2. **توجيه الـ API المباشر (`_routes.json`):**
   - تم إنشاء ملف `_routes.json` لضمان توجيه مسارات `/api/*` فقط إلى Functions، بينما يتم تقديم جميع الصور والملفات الثابتة والأيقونات من شبكة Cloudflare CDN مباشرة وفائقة السرعة ومجاناً.
3. **توافق كامل مع Node.js في Worker:**
   - تم ضبط اتصال قاعدة البيانات وتشفير كلمات المرور (`scrypt`) وتوليد الجلسات لتعمل بتوافق كامل مع بيئة Cloudflare Pages Functions.

---

## 6. النشر اليدوي عبر موجه الأوامر (CLI)

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

## 7. فحص حالة الموقع بعد النشر

بعد اكتمال النشر، افتح الرابط التالي على موقعك:
`https://<your-project>.pages.dev/api/health`

- إذا كانت النتيجة `{"status":"ok","database":"connected","requiredTables":"present"}`: فالاتصال والمخطط جاهزان.
- إذا ظهرت `database_schema_incomplete`: نفّذ تحديث المخطط الموضح أعلاه.
- إذا ظهرت `database_unavailable`: راجع `errorCode` و`errorType`؛ تحقق من binding `HYPERDRIVE` أو سر `DATABASE_URL` واتصال Supabase.
- إذا ظهر `MISSING_RUNTIME_CONFIGURATION`: تأكد من إضافة binding `HYPERDRIVE` أو سر `DATABASE_URL`، بالإضافة إلى `ADMIN_PASSWORD` و`SESSION_SECRET`، في بيئة النشر الصحيحة.
