import fs from "fs";
import {
  CANONICAL_STATUSES,
  CANONICAL_STATUS_LABELS,
  TUTOR_ACTION_STATUSES,
  TERMINAL_STATUSES,
  MARKETPLACE_ACTIVE_STATUSES,
  HOME_TUITION_PENDING_STATUSES,
} from "../contracts/tracking.contract";
import { renderFrontendContract, FRONTEND_CONTRACT_PATH } from "../scripts/generateFrontendContracts";
import { computeCanonicalStatus, getCanonicalStatusLabel } from "../services/tracking.service";
import type { ITutorProfile } from "../models/TutorProfile.model";

describe("tutor application status contract", () => {
  it("has a label for every canonical status and no orphan labels", () => {
    expect(Object.keys(CANONICAL_STATUS_LABELS).sort()).toEqual([...CANONICAL_STATUSES].sort());
    for (const status of CANONICAL_STATUSES) {
      expect(CANONICAL_STATUS_LABELS[status]).toBeTruthy();
      expect(getCanonicalStatusLabel(status)).toBe(CANONICAL_STATUS_LABELS[status]);
    }
  });

  it("keeps every grouped status inside the canonical set", () => {
    const canonical = new Set<string>(CANONICAL_STATUSES);
    for (const group of [TUTOR_ACTION_STATUSES, TERMINAL_STATUSES, MARKETPLACE_ACTIVE_STATUSES, HOME_TUITION_PENDING_STATUSES]) {
      for (const status of group) expect(canonical.has(status)).toBe(true);
    }
  });

  it("ships a frontend contract that matches the backend source of truth", () => {
    expect(fs.existsSync(FRONTEND_CONTRACT_PATH)).toBe(true);
    const normalize = (text: string) => text.split("\r\n").join("\n");
    expect(normalize(fs.readFileSync(FRONTEND_CONTRACT_PATH, "utf8"))).toBe(normalize(renderFrontendContract()));
  });

  it("exposes every status the backend can compute", () => {
    // Guards the failure this contract exists to prevent: a backend status
    // computed at runtime but missing from the frontend module, which renders
    // as raw enum text instead of a label.
    const profiles = [
      { suspendedAt: new Date() },
      { reVerificationRequired: true },
      { verificationStatus: "rejected" },
      {},
      { verificationStatus: "approved", agreementAcceptedAt: new Date() },
    ];

    for (const profile of profiles) {
      const status = computeCanonicalStatus(profile as unknown as ITutorProfile);
      expect(CANONICAL_STATUSES).toContain(status);
      expect(getCanonicalStatusLabel(status)).toBe(CANONICAL_STATUS_LABELS[status]);
    }
  });
});