# تشغيل الموقع على Cloudflare Workers

هذا المشروع يحتاج إلى Worker لواجهة API وإلى ملفات الواجهة المبنية. لذلك يجب أن يكون نوع المشروع **Workers**، وأن تُستخدم إعدادات Wrangler الموجودة في `wrangler.jsonc`.

## إعداد Cloudflare Workers Builds

في إعدادات البناء للمستودع:

- **Build command:** `pnpm run build:cloudflare`
- **Deploy command:** `pnpm exec wrangler deploy`
- **Preview command:** `pnpm exec wrangler dev`
- **Root directory:** اتركه فارغًا ليستخدم مجلد المستودع الرئيسي.

نسخة pnpm محددة في `package.json` لتتوافق مع ملف القفل، ويطلب `.npmrc` من pnpm التبديل إليها تلقائيًا. إذا كانت إعدادات المشروع في Cloudflare تحتوي متغير `PNPM_VERSION` يدويًا، اجعله `10.11.1`.

## ربط Supabase بقاعدة البيانات

يستخدم Worker اتصال PostgreSQL من خلال `pg` ويقرأ رابط الاتصال من سر اسمه `DATABASE_URL`. لبيئة Workers استخدم **Transaction pooler** من Supabase (المنفذ `6543`).

من Supabase اختر **Connect → Transaction pooler** وانسخ رابط الاتصال، عادةً يكون على المنفذ `6543`. هذا مناسب لطلبات Worker القصيرة، ويتفادى اعتماد الموقع على Hyperdrive. ألصق الرابط كاملًا في Cloudflare كـ Secret، ولا تضعه في GitHub أو ملف إعداد Wrangler. إذا كانت كلمة المرور تحتوي رموزًا خاصة، انسخ الرابط من Supabase مع ترميز كلمة المرور كما يعرضها الاتصال.

## إضافة الأسرار

من إعدادات Worker في Cloudflare أضف هذه القيم كـ **Secrets** (لا تضعها في GitHub):

- `ADMIN_PASSWORD` — كلمة مرور إدارة طويلة.
- `SESSION_SECRET` — سر جلسة عشوائي لا يقل عن 32 حرفًا.
- `DATABASE_URL` — رابط Supabase **Transaction pooler** الكامل، وعادةً يكون المنفذ `6543`، ويُحفظ كـ Secret.
- `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` — اختياريان لإشعارات الطلبات.

مهم: إعدادات **Build variables and secrets** ليست إعدادات التشغيل. أضف الأسرار من **Workers & Pages → khira → Settings → Variables and Secrets → Runtime variables and secrets**، واختر بيئة **Production** ثم **Add variable**، وحدد النوع **Secret**. أضف `DATABASE_URL` و`ADMIN_PASSWORD` و`SESSION_SECRET` (والاختياريين `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID`)، ثم احفظ وأعد النشر. إذا كنت تستخدم المعاينة فأضفها أيضًا لبيئة Preview.

بعد النشر افتح `https://khira.ly/api/health`:
- `status: ok` يعني أن Worker اتصل بقاعدة البيانات والجداول الأساسية موجودة.
- `MISSING_RUNTIME_SECRETS` يعني أن الأسرار لم تُضف في Runtime لبيئة Production.
- `database_unavailable` يعني أن رابط الاتصال أو بياناته أو المنفذ بحاجة إلى تصحيح.
- `database_schema_incomplete` يعرض أسماء الجداول الناقصة.

## أوامر البناء والنشر

Cloudflare Workers Builds يشغّل أوامر البناء والنشر أعلاه تلقائيًا عند وصول تحديث إلى الفرع المتصل. للتشغيل يدويًا من جهازك بعد تسجيل الدخول إلى Wrangler: `pnpm run deploy:cloudflare`.
