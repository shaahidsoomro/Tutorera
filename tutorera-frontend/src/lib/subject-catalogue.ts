/** Curated catalogue from MENTISERA Online School; verify active offerings before publishing changes. */
export type CatalogueSubject = { name: string; code?: string };
export type CatalogueGroup = { curriculum: string; qualification: string; subjects: CatalogueSubject[] };
export const subjectCatalogue: CatalogueGroup[] = [
  {
    "curriculum": "FBISE",
    "qualification": "Class 9",
    "subjects": [
      {
        "name": "English"
      },
      {
        "name": "Urdu"
      },
      {
        "name": "Islamiyat / Ethics"
      },
      {
        "name": "Mathematics"
      },
      {
        "name": "Physics"
      },
      {
        "name": "Chemistry"
      },
      {
        "name": "Biology"
      },
      {
        "name": "Computer Science"
      }
    ]
  },
  {
    "curriculum": "FBISE",
    "qualification": "Class 10",
    "subjects": [
      {
        "name": "English"
      },
      {
        "name": "Urdu"
      },
      {
        "name": "Pakistan Studies"
      },
      {
        "name": "Mathematics"
      },
      {
        "name": "Physics"
      },
      {
        "name": "Chemistry"
      },
      {
        "name": "Biology"
      },
      {
        "name": "Computer Science"
      }
    ]
  },
  {
    "curriculum": "FBISE",
    "qualification": "Class 11",
    "subjects": [
      {
        "name": "English"
      },
      {
        "name": "Urdu"
      },
      {
        "name": "Islamic Education"
      },
      {
        "name": "Mathematics"
      },
      {
        "name": "Physics"
      },
      {
        "name": "Chemistry"
      },
      {
        "name": "Biology"
      },
      {
        "name": "Computer Science"
      }
    ]
  },
  {
    "curriculum": "FBISE",
    "qualification": "Class 12",
    "subjects": [
      {
        "name": "English"
      },
      {
        "name": "Urdu"
      },
      {
        "name": "Pakistan Studies"
      },
      {
        "name": "Mathematics"
      },
      {
        "name": "Physics"
      },
      {
        "name": "Chemistry"
      },
      {
        "name": "Biology"
      },
      {
        "name": "Computer Science"
      }
    ]
  },
  {
    "curriculum": "Cambridge",
    "qualification": "O Level",
    "subjects": [
      {
        "name": "Mathematics",
        "code": "4024"
      },
      {
        "name": "English Language",
        "code": "1123"
      },
      {
        "name": "Physics",
        "code": "5054"
      },
      {
        "name": "Chemistry",
        "code": "5070"
      },
      {
        "name": "Biology",
        "code": "5090"
      },
      {
        "name": "Computer Science",
        "code": "2210"
      },
      {
        "name": "Economics",
        "code": "2281"
      },
      {
        "name": "Business Studies",
        "code": "7115"
      },
      {
        "name": "Accounting",
        "code": "7707"
      },
      {
        "name": "Pakistan Studies",
        "code": "2059"
      },
      {
        "name": "Islamiyat",
        "code": "2058"
      }
    ]
  },
  {
    "curriculum": "Cambridge",
    "qualification": "IGCSE",
    "subjects": [
      {
        "name": "Mathematics (Extended)",
        "code": "0580"
      },
      {
        "name": "English as a Second Language",
        "code": "0511"
      },
      {
        "name": "Physics",
        "code": "0625"
      },
      {
        "name": "Chemistry",
        "code": "0620"
      },
      {
        "name": "Biology",
        "code": "0610"
      },
      {
        "name": "Computer Science",
        "code": "0478"
      },
      {
        "name": "Economics",
        "code": "0455"
      },
      {
        "name": "Business Studies",
        "code": "0450"
      },
      {
        "name": "Accounting",
        "code": "0452"
      },
      {
        "name": "History",
        "code": "0470"
      },
      {
        "name": "Geography",
        "code": "0460"
      }
    ]
  },
  {
    "curriculum": "Cambridge",
    "qualification": "AS & A Level",
    "subjects": [
      {
        "name": "Mathematics",
        "code": "9709"
      },
      {
        "name": "Further Mathematics",
        "code": "9231"
      },
      {
        "name": "Physics",
        "code": "9702"
      },
      {
        "name": "Chemistry",
        "code": "9701"
      },
      {
        "name": "Biology",
        "code": "9700"
      },
      {
        "name": "Computer Science",
        "code": "9618"
      },
      {
        "name": "Economics",
        "code": "9708"
      },
      {
        "name": "Business",
        "code": "9609"
      },
      {
        "name": "Accounting",
        "code": "9706"
      },
      {
        "name": "Psychology",
        "code": "9990"
      },
      {
        "name": "English Language",
        "code": "9093"
      }
    ]
  },
  {
    "curriculum": "Pearson Edexcel",
    "qualification": "International GCSE",
    "subjects": [
      {
        "name": "Mathematics A",
        "code": "4MA1"
      },
      {
        "name": "English Language",
        "code": "4EA1"
      },
      {
        "name": "Physics",
        "code": "4PH1"
      },
      {
        "name": "Chemistry",
        "code": "4CH1"
      },
      {
        "name": "Biology",
        "code": "4BI1"
      },
      {
        "name": "Computer Science",
        "code": "4CP1"
      },
      {
        "name": "Economics",
        "code": "4EC1"
      },
      {
        "name": "Business Studies",
        "code": "4BS1"
      },
      {
        "name": "Accounting",
        "code": "4AC1"
      }
    ]
  },
  {
    "curriculum": "Pearson Edexcel",
    "qualification": "International A Level",
    "subjects": [
      {
        "name": "Mathematics",
        "code": "YMA01"
      },
      {
        "name": "Physics",
        "code": "YPH01"
      },
      {
        "name": "Chemistry",
        "code": "YCH01"
      },
      {
        "name": "Biology",
        "code": "YBI01"
      },
      {
        "name": "Computer Science",
        "code": "YCS01"
      },
      {
        "name": "Economics",
        "code": "YEC01"
      },
      {
        "name": "Business",
        "code": "YBS01"
      },
      {
        "name": "Accounting",
        "code": "YAC01"
      }
    ]
  }
];

/** Distinct subject names for the existing onboarding multi-select controls. */
export const catalogueSubjectNames = Array.from(new Set(subjectCatalogue.flatMap(group => group.subjects.map(subject => subject.name)))).sort((a, b) => a.localeCompare(b));

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export interface SubjectEntry { name: string; slug: string }
export interface SubjectGuide { summary: string; topics: string[] }

export const SUBJECT_GUIDES: Record<string, SubjectGuide> = {};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.tutorera.ac.pk/api/v1";

export async function getSubjectCatalogue(): Promise<{ subjects: SubjectEntry[]; live: boolean }> {
  try {
    const r = await fetch(`${API_URL}/subjects?limit=200`, { next: { revalidate: 3600 } });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.subjects) && d.subjects.length > 0) {
        return {
          subjects: (d.subjects as { name: string; slug?: string }[]).map(s => ({ name: s.name, slug: s.slug || slugify(s.name) })),
          live: true,
        };
      }
    }
  } catch { /* fall through */ }
  return {
    subjects: catalogueSubjectNames.map(name => ({ name, slug: slugify(name) })),
    live: false,
  };
}
