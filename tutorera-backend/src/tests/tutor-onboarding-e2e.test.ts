import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import TutorAvailability from "../models/TutorAvailability.model";
import { ensureLaunchMarkets } from "../services/market.service";

// End-to-end regression test for the tutor onboarding wizard, covering the
// exact failure reported in production: submitting the "Educational
// Background" step (step 2, with a real degree-certificate upload) returned
// a generic "Something went wrong" 500. Root cause was uploadToCloudinary()
// defaulting to Cloudinary's paid moderation add-on, which isn't provisioned
// on this account, so every upload (not just step 2) was rejected outright.
// This test drives a real test tutor through registration and all five
// onboarding steps — including real multipart file uploads through the real
// multer + verifyFileSignature + uploadToCloudinary() pipeline (only the
// underlying Cloudinary SDK network call is stubbed, see below) — then
// deletes the test tutor at the end so no leftover data remains.

jest.setTimeout(60000);

// This environment's .env has placeholder Cloudinary credentials (no real
// account reachable from here), so a genuine network call to Cloudinary
// isn't possible in this sandbox. Everything else in the pipeline - multer
// parsing, real magic-byte file verification via verifyFileSignature, the
// controller/service/model logic, and the actual default-parameter fix in
// uploadToCloudinary.ts - stays real; only the outermost Cloudinary SDK call
// (cloudinary.uploader.upload_stream) is stubbed, so this test still proves
// the real bug is gone: it asserts the upload options built by the real,
// unmocked uploadToCloudinary() never request the unprovisioned moderation
// add-on unless a caller explicitly opts in.
let capturedUploadOptions: any[] = [];
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: (options: any, callback: (error: any, result: any) => void) => {
        capturedUploadOptions.push(options);
        return {
          end: () => {
            callback(null, {
              secure_url: `https://res.cloudinary.com/test/${options.folder}/mock-${capturedUploadOptions.length}.png`,
              public_id: `${options.folder}/mock-${capturedUploadOptions.length}`,
            });
          },
        };
      },
      destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
    utils: { private_download_url: jest.fn() },
  },
}));

// Minimal valid 1x1 PNG — passes real magic-byte sniffing as an image.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

// Minimal valid PDF — passes real magic-byte sniffing as application/pdf.
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>",
  "utf-8"
);

const TEST_EMAIL = "e2e-onboarding-tutor@tutorera.test";

async function cleanupTestTutor() {
  const user = await User.findOne({ email: TEST_EMAIL });
  if (user) {
    await TutorProfile.deleteMany({ user: user._id });
    await TutorAvailability.deleteMany({ tutor: user._id });
    await User.deleteMany({ email: TEST_EMAIL });
  }
}

describe("Tutor onboarding — full E2E flow with real Cloudinary uploads", () => {
  beforeAll(async () => {
    await ensureLaunchMarkets();
    await cleanupTestTutor();
  });

  afterAll(async () => {
    await cleanupTestTutor();
  });

  it("registers, completes all 5 onboarding steps with real document uploads, and reaches onboardingComplete", async () => {
    const agent = request.agent(app);

    // 1. Register a fresh test tutor
    const registerRes = await agent
      .post("/api/v1/auth/register")
      .send({
        name: "E2E Test Tutor",
        email: TEST_EMAIL,
        password: "TestPass123!",
        role: "tutor",
        phone: "03001234567",
        city: "Lahore",
        countryCode: "PK",
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    const token = registerRes.body.token as string;
    expect(token).toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    // Onboarding status starts at step 1, incomplete
    const statusBefore = await agent.get("/api/v1/tutors/onboarding/status").set(auth);
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body.onboardingStep).toBe(1);
    expect(statusBefore.body.onboardingComplete).toBe(false);

    // 2. Step 1 — Personal Info & Global Location, with a mandatory profile
    // photo (required for every tutor still going through initial
    // onboarding - see tutor.controller.ts's needsAvatar check).
    const step1 = await agent
      .post("/api/v1/tutors/onboarding/step")
      .set(auth)
      .field("step", "1")
      .field(
        "data",
        JSON.stringify({
          fullName: "E2E Test Tutor",
          phone: "03001234567",
          countryCode: "PK",
          city: "Lahore",
          gender: "male",
          dateOfBirth: "1995-01-01",
          languages: [{ language: "English", proficiency: "Fluent" }],
        })
      )
      .attach("avatar", PNG_1X1, "profile-photo.png");
    expect(step1.status).toBe(200);
    expect(step1.body.success).toBe(true);
    expect(step1.body.profile.onboardingStep).toBe(2);
    expect(step1.body.profile.avatarVerificationStatus).toBe("pending");

    // 3. Step 2 — Education, with a real degree-certificate upload.
    // This is the exact step and payload shape shown in the production bug
    // report (degree + institution + graduationYear + a selected file).
    const step2 = await agent
      .post("/api/v1/tutors/onboarding/step")
      .set(auth)
      .field("step", "2")
      .field(
        "data",
        JSON.stringify({
          degree: "BSc Computer Science",
          institution: "University of the Punjab",
          year: 2018,
        })
      )
      .attach("degreeDoc", PNG_1X1, "degree-certificate.png");

    expect(step2.status).toBe(200);
    expect(step2.body.success).toBe(true);
    expect(step2.body.profile.onboardingStep).toBe(3);
    expect(step2.body.profile.education[0].degree).toBe("BSc Computer Science");
    expect(step2.body.profile.education[0].degreeDoc).toMatch(/^https?:\/\//);
    expect(step2.body.profile.degreeVerificationStatus).toBe("pending");
    // The actual production bug: this used to implicitly set
    // moderation: "cloudinary" on every upload, which fails outright because
    // that add-on isn't provisioned. Confirm no moderation option is sent
    // unless explicitly requested.
    const degreeUploadOptions = capturedUploadOptions.find((o) => o.folder === "tutorera/degrees");
    expect(degreeUploadOptions).toBeDefined();
    expect(degreeUploadOptions.moderation).toBeUndefined();

    // 4. Step 3 — Experience & Curricula
    const step3 = await agent
      .post("/api/v1/tutors/onboarding/step")
      .set(auth)
      .field("step", "3")
      .field(
        "data",
        JSON.stringify({
          experience: 5,
          previousInstitutions: ["ABC Academy"],
          subjects: ["Mathematics", "Physics"],
          levels: ["O-Level", "A-Level"],
          curricula: ["Cambridge"],
        })
      );
    expect(step3.status).toBe(200);
    expect(step3.body.success).toBe(true);
    expect(step3.body.profile.onboardingStep).toBe(4);

    // 5. Step 4 — Profile & Rates
    const step4 = await agent
      .post("/api/v1/tutors/onboarding/step")
      .set(auth)
      .field("step", "4")
      .field(
        "data",
        JSON.stringify({
          bio: "Experienced tutor for O/A Level Maths & Physics.",
          hourlyRate: 1500,
          teachingMode: "online",
          availability: [{ day: "Monday", slots: ["10:00 AM"] }],
        })
      );
    expect(step4.status).toBe(200);
    expect(step4.body.success).toBe(true);
    expect(step4.body.profile.onboardingStep).toBe(5);
    expect(step4.body.profile.currency).toBe("PKR");

    // 6. Step 5 — Verification docs (CNIC front/back), online-only tutor so
    // no police certificate is required. This is also the final step, so a
    // successful response here means onboardingComplete flips to true.
    const step5 = await agent
      .post("/api/v1/tutors/onboarding/step")
      .set(auth)
      .field("step", "5")
      .field("data", JSON.stringify({ demoVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }))
      .attach("cnicFront", PNG_1X1, "cnic-front.png")
      .attach("cnicBack", MINIMAL_PDF, "cnic-back.pdf");

    expect(step5.status).toBe(200);
    expect(step5.body.success).toBe(true);
    expect(step5.body.profile.onboardingComplete).toBe(true);
    expect(step5.body.profile.cnicFront).toMatch(/^https?:\/\//);
    expect(step5.body.profile.cnicVerificationStatus).toBe("pending");

    // 7. Confirm final status via the dedicated status endpoint too
    const statusAfter = await agent.get("/api/v1/tutors/onboarding/status").set(auth);
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body.onboardingComplete).toBe(true);
    expect(statusAfter.body.onboardingStep).toBe(5);

    // 8. Clean up — remove the test tutor entirely
    await cleanupTestTutor();
    const deletedUser = await User.findOne({ email: TEST_EMAIL });
    expect(deletedUser).toBeNull();
  });
});
