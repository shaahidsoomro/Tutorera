import TutorProfile from "../models/TutorProfile.model";
import User from "../models/User.model";
import TutorAgreementAcceptance from "../models/TutorAgreementAcceptance.model";
import { seedDefaultLegalAgreements } from "../services/legalAgreement.service";
import { evaluateMarketplaceAccess, hasApprovedTeachingSubject, hasCoreDocumentsApproved } from "../services/eligibility.service";
import { isProfileMarketplaceEligible, evaluateTutorActivation } from "../services/tutorActivation.service";
import { isMarketplaceEligible } from "../services/tracking.service";

const approvedSubject = { subject: "Mathematics", levels: ["Matric"], status: "approved" as const, matchesDiscipline: false, requestedAt: new Date() };

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    countryCode: "PK",
    teachingMode: "online",
    cnicVerificationStatus: "approved",
    degreeVerificationStatus: "approved",
    demoVideoStatus: "approved",
    agreementAcceptedAt: new Date(),
    verificationStatus: "approved",
    isVerified: true,
    tutorStatus: "active",
    subjectEligibility: [approvedSubject],
    onboardingComplete: true,
    fullName: "Eligibility Tutor",
    hourlyRate: 2000,
    subjects: ["Mathematics"],
    cnicFront: "cnic-front-id",
    videoIntro: "video-id",
    education: [{ degree: "BS Mathematics", institution: "FAST", year: 2020 }],
    ...overrides,
  };
}

async function createTutor(profileOverrides: Record<string, unknown> = {}) {
  const user = await User.create({ name: "Eligibility Tutor", email: `elig-${Date.now()}-${Math.random()}@test.com`, password: "password123", role: "tutor" });
  const profile = await TutorProfile.create({ user: user._id, ...baseProfile(profileOverrides) });
  return { user, profile };
}

describe("marketplace eligibility has one authority (audit P1-03)", () => {
  it("keeps a fully approved tutor eligible and agrees across all call sites", async () => {
    const { profile } = await createTutor();

    const access = evaluateMarketplaceAccess(profile.toObject());
    expect(access.eligible).toBe(true);
    expect(access.grandfatherBypassActive).toBe(false);
    expect(isProfileMarketplaceEligible(profile)).toBe(true);
    expect(isMarketplaceEligible(profile)).toBe(true);
  });

  it("blocks a tutor whose documents are not approved, with no grandfather exemption for the strict authority", async () => {
    const { profile } = await createTutor({ degreeVerificationStatus: "pending", isVerified: true });

    expect(evaluateMarketplaceAccess(profile.toObject()).eligible).toBe(false);
    expect(isProfileMarketplaceEligible(profile)).toBe(false);
    expect(isMarketplaceEligible(profile)).toBe(false);
  });

  it("allows an explicitly admin-exempt profile through approval gates", async () => {
    const { profile } = await createTutor({
      adminApprovalExempt: true,
      cnicVerificationStatus: "pending",
      degreeVerificationStatus: "pending",
      demoVideoStatus: "pending",
      subjectEligibility: [],
      agreementAcceptedAt: undefined,
      verificationStatus: "pending",
      isVerified: false,
    });

    const access = evaluateMarketplaceAccess(profile.toObject());
    expect(access.eligible).toBe(true);
    expect(access.coreApproved).toBe(true);
    expect(access.subjectApproved).toBe(true);
    expect(access.agreementSatisfied).toBe(true);
  });

  it("blocks a tutor with documents but no approved subject and level", async () => {
    const { profile } = await createTutor({ subjectEligibility: [] });

    const access = evaluateMarketplaceAccess(profile.toObject());
    expect(access.eligible).toBe(false);
    expect(access.subjectApproved).toBe(false);
    expect(hasApprovedTeachingSubject(profile)).toBe(false);
    expect(isProfileMarketplaceEligible(profile)).toBe(false);
  });

  it("treats a subject approved with no levels as not approved", async () => {
    const { profile } = await createTutor({ subjectEligibility: [{ ...approvedSubject, levels: [] }] });
    expect(hasApprovedTeachingSubject(profile)).toBe(false);
    expect(isProfileMarketplaceEligible(profile)).toBe(false);
  });

  it("always blocks suspended and re-verification profiles, even when grandfathered", async () => {
    const suspended = await createTutor({ suspendedAt: new Date(), degreeVerificationStatus: "pending" });
    expect(evaluateMarketplaceAccess(suspended.profile.toObject(), { grandfathered: true }).eligible).toBe(false);

    const reverify = await createTutor({ reVerificationRequired: true, degreeVerificationStatus: "pending" });
    expect(evaluateMarketplaceAccess(reverify.profile.toObject(), { grandfathered: true }).eligible).toBe(false);
  });

  it("reports the grandfather bypass only for legacy activated profiles missing document approvals", async () => {
    const legacy = await createTutor({ degreeVerificationStatus: "pending", marketplaceEligible: true });

    const strict = evaluateMarketplaceAccess(legacy.profile.toObject());
    expect(strict.grandfatherBypassActive).toBe(false);
    expect(strict.eligible).toBe(false);

    const grandfathered = evaluateMarketplaceAccess(legacy.profile.toObject(), { grandfathered: true });
    expect(grandfathered.grandfatherBypassActive).toBe(true);
    expect(grandfathered.eligible).toBe(true);
  });

  it("never grants the bypass to a profile that is not already activated", async () => {
    const { profile } = await createTutor({ degreeVerificationStatus: "pending", marketplaceEligible: false });
    const access = evaluateMarketplaceAccess(profile.toObject(), { grandfathered: true });
    expect(access.grandfatherBypassActive).toBe(false);
    expect(access.eligible).toBe(false);
  });

  it("agrees with the shared predicate for each individual document gate", async () => {
    const { profile } = await createTutor();
    expect(hasCoreDocumentsApproved(profile)).toBe(true);
    expect(evaluateMarketplaceAccess(profile.toObject()).coreApproved).toBe(true);

    const { profile: missing } = await createTutor({ demoVideoStatus: "rejected" });
    expect(hasCoreDocumentsApproved(missing)).toBe(false);
    expect(evaluateMarketplaceAccess(missing.toObject()).coreApproved).toBe(false);
    expect(isProfileMarketplaceEligible(missing)).toBe(false);
  });

  it("activation evaluation confirms active status against the shared access rule", async () => {
    const publishedAgreement = await seedDefaultLegalAgreements();
    const { user, profile } = await createTutor();
    await TutorAgreementAcceptance.create({
      tutor: user._id,
      tutorProfile: profile._id,
      legalAgreement: publishedAgreement._id,
      agreementVersion: publishedAgreement.version,
      agreementHash: publishedAgreement.contentHash,
      country: "PK",
      locale: "en",
      legalNameAtAcceptance: "Eligibility Tutor",
      electronicSignature: "Eligibility Tutor",
      acceptedAt: new Date(),
      effectiveAt: new Date(),
      consents: {
        consentAgreement: true,
        consentInformationAccuracy: true,
        consentSafeguarding: true,
        consentIndependentContractor: true,
        consentFeesTaxes: true,
        consentElectronicRecords: true,
      },
      feeDisclosureSnapshot: { marketplaceFeePercent: 20, taxRatePercent: 0, currency: "USD", effectiveFrom: "2026-08-30" },
      contractSnapshot: {
        title: publishedAgreement.title,
        version: publishedAgreement.version,
        content: publishedAgreement.content,
        companyLegalName: "MENTISERA (SMC-Private) Limited",
        tradingName: "TUTORERA®",
        registeredAddress: "Islamabad, Pakistan",
        contactEmail: "hello@mentisera.pk",
      },
    });

    const evaluation = await evaluateTutorActivation(user._id);
    expect(evaluation.tutorStatus).toBe("active");
    expect(evaluation.isEligible).toBe(true);
  });
});