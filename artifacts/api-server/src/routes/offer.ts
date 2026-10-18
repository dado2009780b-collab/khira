import { Router, type IRouter } from "express";
import { GetOfferResponse } from "@workspace/api-zod";
import { getOfferPayload } from "../lib/bookBundleContent";

const router: IRouter = Router();

router.get("/offer", async (req, res): Promise<void> => {
  const offer = await getOfferPayload();
  req.log.info("Serving public bundle offer");
  res.setHeader("Cache-Control", "no-store");
  res.json(GetOfferResponse.parse(offer));
});

export default router;
