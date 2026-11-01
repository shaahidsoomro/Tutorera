import { Router } from "express";
import { submitClaim, getMyClaims } from "../controllers/guaranteeClaim.controller";
import { protect } from "../middlewares/auth.middleware";
import { validate, submitClaimSchema } from "../validators/guarantee.validator";

const router = Router();

router.post("/claim", protect, validate(submitClaimSchema), submitClaim);
router.get("/my", protect, getMyClaims);

export default router;