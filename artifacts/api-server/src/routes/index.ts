import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicOfferRouter from "./offer";
import ordersRouter from "./orders";
import adminPasswordRouter from "./adminPassword";
import adminRouter from "./admin";
import bookCoversRouter from "./bookCovers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicOfferRouter);
router.use(ordersRouter);
router.use(adminPasswordRouter);
router.use(bookCoversRouter);
router.use(adminRouter);

export default router;
