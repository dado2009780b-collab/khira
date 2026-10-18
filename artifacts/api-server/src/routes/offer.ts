import { Router, type IRouter } from "express";
import { GetOfferResponse } from "@workspace/api-zod";
import { getOfferPayload } from "../lib/bookBundleContent";

const router: IRouter = Router();

router.get("/offer", async (req, res): Promise<void> => {
  const offer = await getOfferPayload();
  req.log.info("Serving public bundle offer");
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  );
  res.json(GetOfferResponse.parse(offer));
});

export default router;
