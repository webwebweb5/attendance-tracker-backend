import express from "express";
import {
  getAllAttendances,
  getMonthlyAttendanceReport,
  getSemesterAttendanceReport,
  recordAttendance,
} from "../controllers/attendance.controller";

const router = express.Router();

router.get("/all-attendances", getAllAttendances);
router.post("/record-attendance", recordAttendance);
router.get("/monthly-report", getMonthlyAttendanceReport);
router.get("/semester-report", getSemesterAttendanceReport);

export default router;
