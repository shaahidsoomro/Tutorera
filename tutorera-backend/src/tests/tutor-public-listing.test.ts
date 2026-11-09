import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";

// Regression test for a field-projection bug: the public tutor search endpoint's
// .select() excluded bio, experience, videoIntro, degreeVerificationStatus, and
// policeVerificationStatus - fields the frontend TutorCard already reads to render
// the bio text, quality score, and per-check verification badges. Those UI elements
// were silently always blank/zero for every listed tutor until this fix.
describe("GET /tutors (public listing field projection)", () => {
  it("includes bio, experience, videoIntro, and granular verification statuses", async () => {
    const user = await User.create({
      name: "Amina Verified",
      email: "amina-verified@tutorera-sample.net",
      password: "password123",
      role: "tutor",
    });

    await TutorProfile.create({
      user: user._id,
      fullName: "Amina Verified",
      isVerified: true,
      verificationStatus: "approved",
      agreementAcceptedAt: new Date(),
      marketplaceEligible: true,
      onboardingComplete: true,
      bio: "Ten years teaching O-Level Physics.",
      experience: 10,
      subjects: ["Physics"],
      levels: ["O-Level"],
      city: "Lahore",
      countryCode: "PK",
      countryName: "Pakistan",
      hourlyRate: 1500,
      currency: "PKR",
      teachingMode: "online",
      videoIntro: "https://cdn.test/video.mp4",
      cnicVerificationStatus: "approved",
      degreeVerificationStatus: "approved",
      demoVideoStatus: "approved",
      policeVerificationStatus: "approved",
    });

    const res = await request(app).get("/api/v1/tutors").expect(200);
    const tutor = res.body.tutors.find((t: { fullName: string }) => t.fullName === "Amina Verified");

    expect(tutor).toBeDefined();
    expect(tutor.bio).toBe("Ten years teaching O-Level Physics.");
    expect(tutor.experience).toBe(10);
    expect(tutor.videoIntro).toBe("https://cdn.test/video.mp4");
    expect(tutor.degreeVerificationStatus).toBe("approved");
    expect(tutor.policeVerificationStatus).toBe("approved");
  });
});
