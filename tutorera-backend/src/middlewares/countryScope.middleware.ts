import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";

export const enforceCountryScope = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.adminRole !== "country_admin") { next(); return; }
  const allowed = (req.user.allowedCountryCodes || []).map((code) => code.toUpperCase());
  if (!allowed.length) {
    res.status(403).json({ success: false, code: "COUNTRY_SCOPE_EMPTY", message: "No country scope is assigned to this administrator." });
    return;
  }
  const requestedInput = String(req.query.countryCode || req.query.country || req.body?.countryCode || "").toUpperCase();
  // A single-country administrator has an unambiguous default scope. Multi-country
  // administrators must select one explicitly so aggregated data is never exposed.
  const requested = requestedInput || (allowed.length === 1 ? allowed[0] : "");
  if (!requested) {
    res.status(400).json({ success: false, code: "COUNTRY_SCOPE_REQUIRED", message: "A country filter is required for country-scoped administration." });
    return;
  }
  if (!allowed.includes(requested)) {
    res.status(403).json({ success: false, code: "COUNTRY_SCOPE_DENIED", message: "This administrator is not authorized for the requested country." });
    return;
  }
  // Do not allow a country administrator through a route that has not been
  // made country-aware yet. This is intentionally restrictive: a partial
  // filter must never become a cross-country data disclosure.
  //
  // The check runs against req.originalUrl rather than req.path because
  // Express strips the matching prefix from req.path when the middleware
  // is attached via router.use("/sub-path", ...). Using originalUrl gives
  // the full URL (e.g. /api/v1/tracking/admin/applications/...) and lets
  // one supported-prefix list cover both /admin/* routes and sub-router
  // routes without caring where the middleware was mounted. Audit P0-3:
  // /admin/applications is the tutor application-review surface served
  // by routes/tracking.routes.ts (mounted at /api/v1/tracking).
  const supported = ["/marketplace/requests", "/marketplace/offers", "/markets", "/geography", "/onboarding", "/users", "/safety/cases", "/integrity", "/admin/applications"].some((prefix) => req.originalUrl.includes(prefix));
  if (!supported) {
    res.status(403).json({ success: false, code: "COUNTRY_SCOPE_ROUTE_UNSUPPORTED", message: "This administrative resource is not yet available in country-scoped mode." });
    return;
  }
  req.countryScopeCode = requested;
  next();
};
