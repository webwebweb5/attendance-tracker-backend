import { Request, Response } from "express";
import Attendance from "../schema/attendance.model";
import XLSX from "xlsx";

export const recordAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, courseId, action, location } = req.body;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      studentId,
      courseId,
      action,
      createdAt: { $gte: todayStart, $lt: todayEnd },
    });

    if (existingAttendance) {
      res.status(400).json({
        error: `Attendance for action '${action}' already recorded today.`,
      });
      return;
    }

    const newAttendance = new Attendance({
      studentId,
      courseId,
      action,
      location,
    });

    await newAttendance.save();

    res.status(200).json({ message: "Attendance recorded" });
  } catch (error) {
    res.status(500).json({ error: "Error recording attendance" });
  }
};

export const getMonthlyAttendanceReport = async (
  req: Request,
  res: Response
) => {
  const { courseId, year, month } = req.query;

  try {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const monthlyReport = await Attendance.aggregate([
      {
        $match: {
          courseId: courseId,
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            studentId: "$studentId",
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          studentId: "$_id.studentId",
          action: "$_id.action",
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
    ]);

    if (req.query.export === "true") {
      return exportToExcel(
        monthlyReport,
        `Monthly_Attendance_${month}_${year}`,
        res
      );
    }

    res.status(200).json(monthlyReport);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error generating monthly attendance report" });
  }
};

export const getSemesterAttendanceReport = async (
  req: Request,
  res: Response
) => {
  const { courseId, semesterStartDate, semesterEndDate } = req.query;
  console.log(semesterStartDate, semesterEndDate);

  try {
    const startDate = new Date(semesterStartDate as string);
    const endDate = new Date(semesterEndDate as string);

    const semesterReport = await Attendance.aggregate([
      {
        $match: {
          courseId: courseId,
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            studentId: "$studentId",
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          studentId: "$_id.studentId",
          action: "$_id.action",
          count: 1,
          _id: 0,
        },
      },
    ]);

    if (req.query.export === "true") {
      return exportToExcel(semesterReport, `Semester_Attendance_Report`, res);
    }

    res.status(200).json(semesterReport);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error generating semester attendance report" });
  }
};

const exportToExcel = (data: any[], filename: string, res: Response) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
  res.send(excelBuffer);
};
