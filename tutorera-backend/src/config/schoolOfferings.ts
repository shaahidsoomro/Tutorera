/** Seed data: subject combinations, not compulsory course requirements. */
export interface SchoolOfferingSeed {
  id: string; boardCode: string; boardName: string; qualificationCode: string; qualificationName: string;
  classLevel?: string; subject: string; subjectDisplay: string; aliases: string[]; approvalLevel: string;
  verificationSource?: string; verificationNote?: string;
}

const slug = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const aliases: Record<string, string[]> = { Mathematics: ["Maths", "Math"], "Computer Science": ["CS", "Computing"], "Business Studies": ["Business"], English: ["English Language", "English as a Second Language"], Islamiyat: ["Islamic Education"] };
const pkBoards = [
  ["fbise", "FBISE"], ["punjab-bise", "Punjab BISE"], ["sindh-bise", "Sindh BISE"],
  ["kp-bise", "Khyber Pakhtunkhwa BISE"], ["balochistan-bise", "Balochistan BISE"],
] as const;
// Board identity and the broad qualifications were checked against public
// official board directories. Subjects are tutoring labels supplied by the
// platform and do not assert an official board syllabus or compulsory grouping.
const provincialBoards: ReadonlyArray<{ code: string; name: string; source: string; qualifications: readonly string[] }> = [
  ...["Bahawalpur", "Dera Ghazi Khan", "Faisalabad", "Gujranwala", "Lahore", "Multan", "Rawalpindi", "Sahiwal", "Sargodha"].map(name => ({ code: `bise-${slug(name)}`, name: `BISE ${name}`, source: "https://hed.punjab.gov.pk/boards", qualifications: ["ssc", "hssc"] })),
  ...["Abbottabad", "Bannu", "Dera Ismail Khan", "Kohat", "Mardan", "Malakand", "Peshawar", "Swat", "Larkana", "Mirpur Khas", "Shaheed Benazirabad", "Sukkur", "Hyderabad", "Quetta"].map(name => ({ code: `bise-${slug(name)}`, name: `BISE ${name}`, source: "https://ibcc.edu.pk/", qualifications: ["ssc", "hssc"] })),
  { code: "bsek-karachi", name: "BSE Karachi", source: "https://www.bsek.edu.pk/", qualifications: ["ssc"] },
  { code: "biek-karachi", name: "BIE Karachi", source: "https://biek.edu.pk/", qualifications: ["hssc"] },
];
type SubjectPair = readonly [string, string?];
const sciences: SubjectPair[] = [["Mathematics"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"]];
const pkClass: Array<{ grade: string; qualificationCode: string; qualificationName: string; approvalLevel: string; subjects: SubjectPair[] }> = [
  { grade: "Class 9", qualificationCode: "ssc", qualificationName: "SSC / Matric", approvalLevel: "Matric (9th & 10th)", subjects: [["English"], ["Urdu"], ["Islamiyat"], ["Ethics"], ...sciences] },
  { grade: "Class 10", qualificationCode: "ssc", qualificationName: "SSC / Matric", approvalLevel: "Matric (9th & 10th)", subjects: [["English"], ["Urdu"], ["Pakistan Studies"], ...sciences] },
  { grade: "Class 11", qualificationCode: "hssc", qualificationName: "HSSC / Intermediate", approvalLevel: "Intermediate / FSc", subjects: [["English"], ["Urdu"], ["Islamiyat", "Islamic Education"], ...sciences] },
  { grade: "Class 12", qualificationCode: "hssc", qualificationName: "HSSC / Intermediate", approvalLevel: "Intermediate / FSc", subjects: [["English"], ["Urdu"], ["Pakistan Studies"], ...sciences] },
];
const camO: SubjectPair[] = [["Mathematics"], ["English", "English Language"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"], ["Economics"], ["Business Studies"], ["Accounting"], ["Pakistan Studies"], ["Islamiyat"]];
const camIgcse: SubjectPair[] = [["Mathematics", "Mathematics — Extended"], ["English", "English as a Second Language"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"], ["Economics"], ["Business Studies"], ["Accounting"], ["History"], ["Geography"]];
const camA: SubjectPair[] = [["Mathematics"], ["Further Mathematics"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"], ["Economics"], ["Business Studies", "Business"], ["Accounting"], ["Psychology"], ["English", "English Language"]];
const pearsonGcse: SubjectPair[] = [["Mathematics", "Mathematics A"], ["English", "English Language"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"], ["Economics"], ["Business Studies"], ["Accounting"]];
const pearsonA: SubjectPair[] = [["Mathematics"], ["Physics"], ["Chemistry"], ["Biology"], ["Computer Science"], ["Economics"], ["Business Studies", "Business"], ["Accounting"]];
const pearsonGcseSource = "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses.a-z.html";
const pearsonAdvancedSource = "https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels.html";
const pearsonCsSource = "https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels/computer-science-2026.html";

function make(boardCode: string, boardName: string, qualificationCode: string, qualificationName: string, approvalLevel: string, subjects: SubjectPair[], classLevel?: string): SchoolOfferingSeed[] {
  return subjects.map(([subject, label]) => ({
    id: [boardCode, qualificationCode, classLevel ? slug(classLevel) : "all", slug(label || subject)].join(":"),
    boardCode, boardName, qualificationCode, qualificationName, ...(classLevel && { classLevel }), subject,
    subjectDisplay: label || subject, aliases: [...new Set([...(aliases[subject] || []), ...(label ? [label] : [])])], approvalLevel,
    ...(boardCode === "pearson" && { verificationSource: subject === "Computer Science" && qualificationCode.startsWith("ial") ? pearsonCsSource : qualificationCode === "igcse" ? pearsonGcseSource : pearsonAdvancedSource,
      ...(subject === "Computer Science" && qualificationCode.startsWith("ial") ? { verificationNote: "First teaching September 2026; first IAS assessment May/June 2027 and IAL assessment May/June 2028." } : {}) }),
  }));
}

export const SCHOOL_OFFERINGS: SchoolOfferingSeed[] = [
  ...pkBoards.flatMap(([code, name]) => pkClass.flatMap((c) => make(code, name, c.qualificationCode, c.qualificationName, c.approvalLevel, c.subjects, c.grade))),
  ...provincialBoards.flatMap(board => pkClass.filter(c => board.qualifications.includes(c.qualificationCode)).flatMap(c => make(board.code, board.name, c.qualificationCode, c.qualificationName, c.approvalLevel, c.subjects, c.grade).map(row => ({ ...row, verificationSource: board.source, verificationNote: "Board identity and broad qualification level verified; subject names are tutoring options, not a statement of compulsory subjects or syllabus coverage." })))),
  ...make("cambridge", "Cambridge International", "o-level", "Cambridge O Level", "O-Level (Cambridge / Edexcel)", camO),
  ...make("cambridge", "Cambridge International", "igcse", "Cambridge IGCSE", "O-Level (Cambridge / Edexcel)", camIgcse),
  ...make("cambridge", "Cambridge International", "as-level", "Cambridge International AS Level", "A-Level (Cambridge / Edexcel)", camA),
  ...make("cambridge", "Cambridge International", "a-level", "Cambridge International A Level", "A-Level (Cambridge / Edexcel)", camA),
  ...make("pearson", "Pearson Edexcel", "igcse", "Pearson Edexcel International GCSE", "O-Level (Cambridge / Edexcel)", pearsonGcse),
  ...make("pearson", "Pearson Edexcel", "ial-as", "Pearson Edexcel International AS Level", "A-Level (Cambridge / Edexcel)", pearsonA),
  ...make("pearson", "Pearson Edexcel", "ial-a", "Pearson Edexcel International A Level", "A-Level (Cambridge / Edexcel)", pearsonA),
];
