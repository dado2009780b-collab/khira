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

لا يحتاج هذا الإعداد إلى Hyperdrive. يستخدم Worker اتصال PostgreSQL عبر TCP مباشرة، ويقرأ رابط الاتصال من سر اسمه `DATABASE_URL`.

من Supabase اختر **Connect → Transaction pooler** وانسخ رابط الاتصال، عادةً يكون على المنفذ `6543`. هذا مناسب لطلبات Worker القصيرة، ويتفادى اعتماد الموقع على Hyperdrive. ألصق الرابط كاملًا في Cloudflare كـ Secret، ولا تضعه في GitHub أو ملف إعداد Wrangler. إذا كانت كلمة المرور تحتوي رموزًا خاصة، انسخ الرابط من Supabase مع ترميز كلمة المرور كما يعرضها الاتصال.

## إضافة الأسرار

من إعدادات Worker في Cloudflare أضف هذه القيم كـ **Secrets** (لا تضعها في GitHub):

- `ADMIN_PASSWORD` — كلمة مرور إدارة طويلة.
- `SESSION_SECRET` — سر جلسة عشوائي لا يقل عن 32 حرفًا.
- `DATABASE_URL` — رابط Supabase **Session pooler** الكامل، ويُحفظ كـ Secret.
- `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` — اختياريان لإشعارات الطلبات.

لإضافة السر: افتح **Workers & Pages → khira → Settings → Variables and Secrets → Add**، واختر نوع **Secret**، ثم الاسم `DATABASE_URL` والصق رابط الاتصال في خانة القيمة. اضغط حفظ، وبعدها أعد النشر. تأكد من ضبط نفس الأسرار في إعدادات بيئتي **Production** و**Preview** إذا كنت ستستخدم المعاينة.

## أوامر البناء والنشر

Cloudflare Workers Builds يشغّل أوامر البناء والنشر أعلاه تلقائيًا عند وصول تحديث إلى الفرع المتصل. للتشغيل يدويًا من جهازك بعد تسجيل الدخول إلى Wrangler: `pnpm run deploy:cloudflare`.
