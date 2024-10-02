import { Request, Response } from "express";
import Attendance from "../schema/attendance.model";
import XLSX from "xlsx";

const UNIVERSITY_LAT = 18.824518;
const UNIVERSITY_LNG = 99.045474;
const RADIUS_IN_KM = 1.5;

export const getAllAttendances = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const attendances = await Attendance.find().sort({ createdAt: -1 });

    res.status(200).json(attendances);
  } catch (error) {
    res.status(500).json({ error: "Error fetching attendances" });
  }
};

export const recordAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, courseId, action, location } = req.body;

    const distance = getDistanceFromLatLonInKm(
      location.lat,
      location.lng,
      UNIVERSITY_LAT,
      UNIVERSITY_LNG
    );

    if (distance > RADIUS_IN_KM) {
      res.status(400).json({
        error: `Your location is outside the allowed area. You must be within ${RADIUS_IN_KM * 100} meters of the university to record attendance.`,
      });
      return;
    }

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

    if (action === "out") {
      const checkingInAttendance = await Attendance.findOne({
        studentId,
        courseId,
        action: "in",
        createdAt: { $gte: todayStart, $lt: todayEnd },
      });

      if (!checkingInAttendance) {
        res.status(400).json({
          error: `Please record action 'in' first before 'out'.`,
        });
        return;
      }
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

  const filePath = `./exported/${filename}.xlsx`;
  XLSX.writeFile(workbook, filePath);
  res.download(filePath);
};

function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1); // deg2rad below
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
