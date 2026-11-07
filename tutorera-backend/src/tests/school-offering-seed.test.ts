import Subject from "../models/Subject.model";
import SchoolOffering from "../models/SchoolOffering.model";
import { SCHOOL_OFFERINGS } from "../config/schoolOfferings";
import { seedSchoolOfferings } from "../services/schoolOfferingSeed.service";

async function seedExistingSubjects() {
  const names = [...new Set(SCHOOL_OFFERINGS.map((item) => item.subject))].filter((name) => !["Further Mathematics", "Ethics"].includes(name));
  await Subject.insertMany(names.map((name, index) => ({ name, code: `FIXTURE-${index}`, slug: `fixture-${index}`, category: "Fixture", status: "active" })));
}

describe("school offering migration", () => {
  it("has distinct board, qualification, class and subject records with reviewed Pearson sources", () => {
    expect(SCHOOL_OFFERINGS).toHaveLength(1026);
    expect(new Set(SCHOOL_OFFERINGS.map((row) => row.id)).size).toBe(1026);
    expect(SCHOOL_OFFERINGS.filter((row) => row.boardCode === "pearson").every((row) => row.verificationSource?.startsWith("https://qualifications.pearson.com/"))).toBe(true);
    expect(SCHOOL_OFFERINGS.filter((row) => row.boardCode === "pearson" && row.qualificationCode.startsWith("ial") && row.subject === "Computer Science")).toHaveLength(2);
    const karachiSecondary = SCHOOL_OFFERINGS.filter(row => row.boardCode === "bsek-karachi");
    const karachiIntermediate = SCHOOL_OFFERINGS.filter(row => row.boardCode === "biek-karachi");
    expect(karachiSecondary).toHaveLength(17); expect(karachiSecondary.every(row => row.qualificationCode === "ssc")).toBe(true);
    expect(karachiIntermediate).toHaveLength(16); expect(karachiIntermediate.every(row => row.qualificationCode === "hssc")).toBe(true);
    for (const name of ["Lahore", "Bahawalpur", "Dera Ghazi Khan", "Peshawar", "Hyderabad", "Quetta"]) {
      const rows = SCHOOL_OFFERINGS.filter(row => row.boardName === `BISE ${name}`);
      expect(rows).toHaveLength(33); expect(rows.every(row => !!row.verificationSource)).toBe(true);
    }
  });

  it("dry runs without writing and repeated apply preserves administrator changes", async () => {
    await seedExistingSubjects();
    const plan = await seedSchoolOfferings();
    expect(plan).toMatchObject({ total: 1026, newOfferings: 1026, applied: false, errors: [] });
    expect(plan.newSubjects.sort()).toEqual(["Ethics", "Further Mathematics"]);
    expect(await SchoolOffering.countDocuments()).toBe(0);
    expect((await seedSchoolOfferings(true)).applied).toBe(true);
    const selected = SCHOOL_OFFERINGS[0].id;
    await SchoolOffering.updateOne({ _id: selected }, { $set: { status: "inactive", reviewReason: "Admin review" } });
    const beforeRepeat = await SchoolOffering.findById(selected).lean();
    expect((await seedSchoolOfferings(true)).newOfferings).toBe(0);
    expect(await SchoolOffering.countDocuments()).toBe(1026);
    const afterRepeat = await SchoolOffering.findById(selected).lean();
    expect(afterRepeat?.status).toBe("inactive");
    expect(afterRepeat?.updatedAt?.getTime()).toBe(beforeRepeat?.updatedAt?.getTime());
    expect(await Subject.countDocuments({ name: "Ethics" })).toBe(1);
  });

  it("fails closed on ambiguous aliases instead of creating duplicates", async () => {
    await seedExistingSubjects();
    await Subject.create({ name: "MATHS", slug: "maths-fixture", code: "FIXTURE-ALIAS", category: "Fixture", status: "active" });
    const result = await seedSchoolOfferings(true);
    expect(result.applied).toBe(false);
    expect(result.errors).toContain("Ambiguous subject: Mathematics");
    expect(await SchoolOffering.countDocuments()).toBe(0);
  });
});
