import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, eq } from "drizzle-orm";
import {
  ChangeAdminPasswordBody,
  ChangeAdminPasswordResponse,
  GetAdminSessionResponse,
  LoginAdminBody,
  LoginAdminResponse,
  LogoutAdminResponse,
} from "@workspace/api-zod";
import { adminCredentialsTable, db } from "@workspace/db";
import {
  clearAdminSessionCookie,
  ensureAdminCredential,
  getAdminCredential,
  hashAdminPassword,
  isSameOriginRequest,
  readAdminSession,
  requireAdmin,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "../middlewares/adminPasswordAuth";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة." },
});

router.get("/admin/session", async (req, res): Promise<void> => {
  const credential = await ensureAdminCredential();
  const session = credential ? await readAdminSession(req, credential) : null;
  res.json(
    GetAdminSessionResponse.parse({
      authenticated: Boolean(session),
      configured: Boolean(credential),
    }),
  );
});

router.post(
  "/admin/login",
  loginLimiter,
  async (req, res): Promise<void> => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: "تعذر التحقق من مصدر الطلب." });
      return;
    }
    const parsed = LoginAdminBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "أدخل كلمة المرور." });
      return;
    }

    const credential = await ensureAdminCredential();
    if (!credential) {
      req.log.error("Administrator password has not been initialized");
      res.status(503).json({
        error: "إعداد دخول الإدارة غير مكتمل. أعد المحاولة بعد اكتمال التهيئة.",
      });
      return;
    }
    if (!(await verifyAdminPassword(parsed.data.password, credential.passwordHash))) {
      res.status(401).json({ error: "كلمة المرور غير صحيحة." });
      return;
    }
    if (!setAdminSessionCookie(res, credential.sessionVersion)) {
      req.log.error("Administrator session signing is unavailable");
      res.status(503).json({ error: "تعذر إنشاء جلسة آمنة." });
      return;
    }

    req.log.info("Administrator password session started");
    res.json(LoginAdminResponse.parse({ authenticated: true, configured: true }));
  },
);

router.post("/admin/logout", async (req, res): Promise<void> => {
  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: "تعذر التحقق من مصدر الطلب." });
    return;
  }
  clearAdminSessionCookie(res);
  res.json(LogoutAdminResponse.parse({ loggedOut: true }));
});

router.patch(
  "/admin/password",
  requireAdmin,
  async (req, res): Promise<void> => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: "تعذر التحقق من مصدر الطلب." });
      return;
    }
    const parsed = ChangeAdminPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "يجب أن تتكون كلمة المرور الجديدة من 12 حرفًا على الأقل.",
      });
      return;
    }
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      res.status(400).json({ error: "اختر كلمة مرور جديدة مختلفة." });
      return;
    }

    const credential = await getAdminCredential();
    if (!credential) {
      res.status(503).json({ error: "إعداد دخول الإدارة غير مكتمل." });
      return;
    }
    if (
      !(await verifyAdminPassword(
        parsed.data.currentPassword,
        credential.passwordHash,
      ))
    ) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة." });
      return;
    }

    const passwordHash = await hashAdminPassword(parsed.data.newPassword);
    const [updated] = await db
      .update(adminCredentialsTable)
      .set({
        passwordHash,
        sessionVersion: credential.sessionVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(adminCredentialsTable.id, 1),
          eq(adminCredentialsTable.passwordHash, credential.passwordHash),
          eq(adminCredentialsTable.sessionVersion, credential.sessionVersion),
        ),
      )
      .returning({ sessionVersion: adminCredentialsTable.sessionVersion });

    if (!updated) {
      res.status(409).json({
        error: "تغيرت بيانات الدخول في جلسة أخرى. سجّل الدخول مجددًا.",
      });
      return;
    }
    if (!setAdminSessionCookie(res, updated.sessionVersion)) {
      req.log.error("Administrator session rotation is unavailable");
      res.status(503).json({ error: "تغيرت كلمة المرور؛ سجّل الدخول مجددًا." });
      return;
    }

    req.log.info("Administrator password changed");
    res.json(
      ChangeAdminPasswordResponse.parse({
        authenticated: true,
        configured: true,
      }),
    );
  },
);

export default router;
