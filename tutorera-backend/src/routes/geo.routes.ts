// src/routes/geo.routes.ts
import { Router } from "express";
import { getCities, getCountries, getCountryCities, getCurrencies, getGlobalSearch, getLocalities, getRegions, getSubjects, getSchoolOfferings, postalLookup } from "../controllers/geo.controller";
import { getVisitorMarket } from "../controllers/externalValidation.controller";
import { cachePublic } from "../middlewares/cacheControl.middleware";
import { providerLookupLimiter } from "../middlewares/rateLimiters";

const router = Router();

// Reference/geo data changes rarely (market launches, GeoNames imports) -
// cache more aggressively than content endpoints. /search and
// /postal-lookup are excluded: they're per-query lookups with a low cache
// hit rate, not content a crawler or repeated SSR fetch would reuse.
router.get("/countries", cachePublic(600), getCountries);
router.get("/subjects", cachePublic(300), getSubjects);
router.get("/school-offerings", cachePublic(300), getSchoolOfferings);
router.get("/regions", cachePublic(300), getRegions);
router.get("/cities", cachePublic(300), getCities);
router.get("/localities", cachePublic(300), getLocalities);
router.get("/search", getGlobalSearch);
router.get("/countries/:code/cities", cachePublic(300), getCountryCities);
router.get("/currencies", cachePublic(600), getCurrencies);
router.get("/postal-lookup", providerLookupLimiter, postalLookup);
router.get("/visitor-market", providerLookupLimiter, getVisitorMarket);

export default router;
