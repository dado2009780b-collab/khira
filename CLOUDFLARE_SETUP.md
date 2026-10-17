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

أنشئ Hyperdrive من لوحة Cloudflare: **Workers & Pages → Hyperdrive → Create configuration**. اختر PostgreSQL، وأدخل اتصال قاعدة Supabase المباشر من **Project Settings → Database**. استخدم الاتصال المباشر، وليس رابط Supabase API أو مفتاح `service_role`.

بعد إنشاء Hyperdrive، انسخ معرّف الإعداد إلى `id` في قسم `hyperdrive` داخل `wrangler.jsonc` بدل `REPLACE_WITH_HYPERDRIVE_ID`. يجب فعل ذلك قبل نشر Worker حتى يستطيع Cloudflare ربط قاعدة البيانات.

## إضافة الأسرار

من إعدادات Worker في Cloudflare أضف هذه القيم كـ **Secrets** (لا تضعها في GitHub):

- `ADMIN_PASSWORD` — كلمة مرور إدارة طويلة.
- `SESSION_SECRET` — سر جلسة عشوائي لا يقل عن 32 حرفًا.
- `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` — اختياريان لإشعارات الطلبات.

لا تضف `DATABASE_URL`: Worker يتصل بقاعدة Supabase عبر Hyperdrive.

## أوامر البناء والنشر

Cloudflare Workers Builds يشغّل أوامر البناء والنشر أعلاه تلقائيًا عند وصول تحديث إلى الفرع المتصل. للتشغيل يدويًا من جهازك بعد تسجيل الدخول إلى Wrangler: `pnpm run deploy:cloudflare`.
