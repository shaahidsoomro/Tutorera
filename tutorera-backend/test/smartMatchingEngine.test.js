const test = require("node:test");
const assert = require("node:assert/strict");
const { MatchingService } = require("../dist/services/matching.service");
const { DEFAULT_MATCHING_CONFIG } = require("../dist/config/matchingConfig");

test("Bayesian rating formula calculates correct weighted score", () => {
  // Formula: (v / (v + m)) * R + (m / (v + m)) * C
  // With C = 4.85, m = 5
  // Case 1: Brand new tutor (v = 0, R = 0) -> should be 4.85
  const newTutorScore = MatchingService.calculateBayesianRating(0, 0);
  assert.equal(Math.round(newTutorScore * 100) / 100, 4.85);

  // Case 2: Established 5-star tutor with 15 reviews (v = 15, R = 5.0)
  // (15 / 20) * 5.0 + (5 / 20) * 4.85 = 3.75 + 1.2125 = 4.9625
  const establishedScore = MatchingService.calculateBayesianRating(5.0, 15);
  assert.equal(Math.round(establishedScore * 100) / 100, 4.96);

  // Case 3: Tutor with single bad 1-star review (v = 1, R = 1.0)
  // (1 / 6) * 1.0 + (5 / 6) * 4.85 = 0.1667 + 4.0417 = 4.21
  const badReviewScore = MatchingService.calculateBayesianRating(1.0, 1);
  assert.ok(badReviewScore > 4.0 && badReviewScore < 4.3);
});

test("Home tuition requires mandatory police certificate verification", async () => {
  const request = {
    _id: "req_home_01",
    subject: "Mathematics",
    level: "O Level",
    teachingMode: "home",
    city: "Lahore",
    countryCode: "PK",
    budget: 3000,
    pricingUnit: "hour",
    currency: "PKR",
    days: ["Monday", "Wednesday"],
    schedule: "Evening",
    genderPreference: "any",
  };

  const unverifiedTutor = {
    _id: "tutor_01",
    user: "user_01",
    isVerified: true,
    policeCertificateVerified: false, // NOT verified
    teachingModes: ["home", "online"],
    subjects: ["Mathematics"],
    levels: ["O Level"],
    curricula: ["Cambridge O/A Levels"],
    city: "Lahore",
    countryCode: "PK",
    hourlyRate: 2500,
    averageRating: 5.0,
    totalReviews: 10,
    active: true,
  };

  const result = await MatchingService.calculateMatchScore(request, unverifiedTutor);
  assert.equal(result.score, 0);
  assert.ok(result.tier === "fair" || result.tier === "other");
  assert.ok(result.reasons[0].includes("Background and safety verification"));
});

test("Matching engine awards high compatibility score for matching credentials and availability", async () => {
  const request = {
    _id: "req_online_01",
    subject: "Physics",
    level: "A Level",
    curriculum: "Cambridge O/A Levels",
    teachingMode: "online",
    city: "Islamabad",
    countryCode: "PK",
    budget: 3500,
    pricingUnit: "hour",
    currency: "PKR",
    days: ["Monday", "Tuesday", "Thursday"],
    schedule: "Evening",
    genderPreference: "any",
  };

  const qualifiedTutor = {
    _id: "tutor_02",
    user: "user_02",
    isVerified: true,
    policeCertificateVerified: true,
    teachingModes: ["online"],
    subjects: ["Physics", "Mathematics"],
    levels: ["A Level", "O Level"],
    curricula: ["Cambridge O/A Levels"],
    city: "Islamabad",
    countryCode: "PK",
    hourlyRate: 3000, // Within student budget of 3500
    averageRating: 4.9,
    totalReviews: 12,
    responseRate: 98,
    completionRate: 95,
    responseTimeMinutes: 20,
    active: true,
  };

  const result = await MatchingService.calculateMatchScore(request, qualifiedTutor);
  assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
  assert.ok(result.tier === "excellent" || result.tier === "strong" || result.tier === "great");
  assert.ok(result.reasons.some(r => r.includes("Physics")));
  assert.ok(result.reasons.some(r => r.includes("budget") || r.includes("Affordable") || r.includes("rate")));
});

test("Default matching config weights sum up properly", () => {
  const onlineSum = Object.values(DEFAULT_MATCHING_CONFIG.onlineWeights).reduce((a, b) => a + b, 0);
  const homeSum = Object.values(DEFAULT_MATCHING_CONFIG.homeWeights).reduce((a, b) => a + b, 0);
  assert.equal(onlineSum, 100);
  assert.equal(homeSum, 100);
});

test("Bidirectional synonym matching matches 'Math' request with 'Mathematics' tutor", async () => {
  const request = {
    _id: "req_synonym_01",
    subject: "Math",
    level: "O-Level",
    teachingMode: "online",
    budget: 2000,
    pricingUnit: "hour",
    currency: "PKR",
  };

  const mathTutor = {
    _id: "tutor_math_01",
    user: "user_math_01",
    isVerified: true,
    teachingMode: "online",
    subjects: ["Mathematics", "Physics"],
    levels: ["O-Level"],
    hourlyRate: 1800,
    currency: "PKR",
  };

  const result = await MatchingService.calculateMatchScore(request, mathTutor);
  assert.ok(result.scoreBreakdown.subject >= 15, `Expected subject score >= 15, got ${result.scoreBreakdown.subject}`);
  assert.ok(result.reasons.some((r) => r.includes("Mathematics") || r.includes("Math") || r.includes("specialist") || r.includes("domain")));
});

test("Monthly budget correctly converts hourly rate to monthly equivalent", async () => {
  const request = {
    _id: "req_monthly_01",
    subject: "Computer Science",
    level: "Intermediate",
    teachingMode: "online",
    budget: 24000, // PKR 24,000 / month
    pricingUnit: "month",
    currency: "PKR",
    sessionsPerWeek: 3,
    sessionDurationMinutes: 60, // 3 sessions/wk * 4 wks = 12 hrs/month
  };

  // Hourly tutor at PKR 2,000/hr (12 * 2000 = 24,000/mo) -> exact budget fit
  const tutor = {
    _id: "tutor_cs_01",
    user: "user_cs_01",
    isVerified: true,
    teachingMode: "online",
    subjects: ["Computer Science"],
    levels: ["Intermediate"],
    hourlyRate: 2000,
    currency: "PKR",
  };

  const result = await MatchingService.calculateMatchScore(request, tutor);
  assert.equal(result.scoreBreakdown.budget, DEFAULT_MATCHING_CONFIG.onlineWeights.budget);
  assert.ok(result.reasons.some((r) => r.includes("Within your preferred budget")));
});

test("Home tuition gives 0 location score if tutor and student are in different cities", async () => {
  const request = {
    _id: "req_home_loc_01",
    subject: "Chemistry",
    level: "Matric",
    teachingMode: "in-person",
    city: "Karachi",
    countryCode: "PK",
    budget: 2500,
    pricingUnit: "hour",
  };

  const lahoreTutor = {
    _id: "tutor_chem_01",
    user: "user_chem_01",
    isVerified: true,
    policeVerificationStatus: "approved",
    teachingMode: "in-person",
    subjects: ["Chemistry"],
    levels: ["Matric"],
    city: "Lahore", // Different city!
    countryCode: "PK",
    serviceAreas: ["Gulberg", "DHA Lahore"],
    hourlyRate: 2000,
  };

  const result = await MatchingService.calculateMatchScore(request, lahoreTutor);
  assert.equal(result.scoreBreakdown.location, 0, "Expected 0 location points for different city in home tuition");
});

test("Ranked matches hydrate tutor profile fields and standard tiers", async () => {
  const request = {
    _id: "req_hydration_01",
    subject: "English",
    level: "Middle",
    teachingMode: "online",
    budget: 2000,
    pricingUnit: "hour",
    currency: "PKR",
  };

  const tutorProfiles = [
    {
      _id: "tutor_prof_01",
      user: {
        _id: "user_eng_01",
        name: "Ayesha Khan",
        email: "ayesha@example.com",
        avatar: "https://avatar.com/ayesha.jpg",
      },
      fullName: "Ayesha Khan",
      isVerified: true,
      teachingMode: "online",
      subjects: ["English"],
      levels: ["Middle"],
      hourlyRate: 1500,
      currency: "PKR",
      experience: 6,
      education: [{ degree: "M.A. English", institution: "Punjab University", year: 2020 }],
      policeVerificationStatus: "approved",
      averageRating: 4.9,
      totalReviews: 8,
    },
  ];

  const ranked = await MatchingService.rankTutors(request, tutorProfiles);
  assert.equal(ranked.length, 1);
  const match = ranked[0];

  // Verify hydrated tutor fields
  assert.equal(match.tutor.name, "Ayesha Khan");
  assert.equal(match.tutor.hourlyRate, 1500);
  assert.equal(match.tutor.experience, 6);
  assert.equal(match.tutor.education[0].degree, "M.A. English");
  assert.equal(match.tutor.policeCertificateVerified, true);
  assert.ok(typeof match.score === "number" && match.score > 0);
  assert.ok(typeof match.matchScore === "number" && match.matchScore > 0);
  assert.ok(["excellent", "great", "good", "fair"].includes(match.tier));
});
