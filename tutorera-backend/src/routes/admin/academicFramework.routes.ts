import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import multer from "multer";
import {
  createAcademicCategory, createAcademicDiscipline, createAcademicSubject, createTeachingEligibilityRule,
  getAcademicFrameworkOverview, listAcademicCategories, listAcademicDisciplines, listAcademicSubjects,
  listTeachingEligibilityRules, listTutorSubjectApprovals, seedRecommendedCategories, updateAcademicCategory,
  updateAcademicDiscipline, updateAcademicSubject, updateTeachingEligibilityRule,
} from "../../controllers/academicFramework.controller";
import { commitAcademicImport, downloadAcademicTemplate, exportAcademicDataset, listAcademicImportHistory, previewAcademicImport } from "../../controllers/academicImportExport.controller";
import { listAdminSchoolOfferings, updateAdminSchoolOffering } from "../../controllers/schoolOffering.controller";

const router = Router();
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
router.use(protect, authorize("admin"), requirePermission("market.configure"));

router.get("/overview", getAcademicFrameworkOverview);
router.get("/school-offerings", listAdminSchoolOfferings);
router.patch("/school-offerings/:id", updateAdminSchoolOffering);
router.get("/tutor-approvals", listTutorSubjectApprovals);
router.route("/categories").get(listAcademicCategories).post(createAcademicCategory);
router.post("/categories/seed", seedRecommendedCategories);
router.patch("/categories/:id", updateAcademicCategory);
router.route("/disciplines").get(listAcademicDisciplines).post(createAcademicDiscipline);
router.patch("/disciplines/:id", updateAcademicDiscipline);
router.route("/subjects").get(listAcademicSubjects).post(createAcademicSubject);
router.patch("/subjects/:id", updateAcademicSubject);
router.route("/eligibility-rules").get(listTeachingEligibilityRules).post(createTeachingEligibilityRule);
router.patch("/eligibility-rules/:id", updateTeachingEligibilityRule);
router.get("/import-export/history", listAcademicImportHistory);
router.get("/import-export/templates/:dataset", downloadAcademicTemplate);
router.get("/import-export/export/:dataset", exportAcademicDataset);
router.post("/import-export/dry-run/:dataset", uploadCsv.single("file"), previewAcademicImport);
router.post("/import-export/commit/:dataset", uploadCsv.single("file"), commitAcademicImport);

export default router;
