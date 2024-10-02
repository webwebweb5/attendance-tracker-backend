import request from "supertest";
import mongoose from "mongoose";
import app from "../index";

describe("Attendance API", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("POST /api/attendance/record-attendance", () => {
    it("should record attendance successfully", async () => {
      const attendanceData = {
        studentId: "12345",
        courseId: "CS101",
        action: "in",
        location: { lat: 18.824500, lng: 99.045400 },
      };

      const res = await request(app)
        .post("/api/attendance/record-attendance")
        .send(attendanceData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Attendance recorded");
    });

    it("should return an error if location is outside the allowed area", async () => {
      const attendanceData = {
        studentId: "12345",
        courseId: "CS101",
        action: "in",
        location: { lat: 18.834518, lng: 99.055474 }, // Outside the allowed radius
      };

      const res = await request(app)
        .post("/api/attendance/record-attendance")
        .send(attendanceData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Your location is outside the allowed area. You must be within 150 meters of the university to record attendance."
      );
    });

    it("should not record duplicate attendance for the same action on the same day", async () => {
      const attendanceData = {
        studentId: "12345",
        courseId: "CS101",
        action: "in",
        location: { lat: 18.824500, lng: 99.045400 },
      };

      // บันทึกการเข้างานครั้งแรก
      await request(app)
        .post("/api/attendance/record-attendance")
        .send(attendanceData);

      // บันทึกการเข้างานครั้งที่สองในวันเดียวกัน
      const res = await request(app)
        .post("/api/attendance/record-attendance")
        .send(attendanceData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Attendance for action 'in' already recorded today."
      );
    });

    it("should return an error if 'out' action is recorded without 'in' action", async () => {
      const attendanceData = {
        studentId: "12346",
        courseId: "CS101",
        action: "out",
        location: { lat: 18.824500, lng: 99.045400 },
      };

      const res = await request(app)
        .post("/api/attendance/record-attendance")
        .send(attendanceData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Please record action 'in' first before 'out'."
      );
    });
  });

  describe("GET /api/attendance/monthly-report", () => {
    it("should return a monthly attendance report", async () => {
      const res = await request(app).get(
        "/api/attendance/monthly-report?courseId=CS101&year=2024&month=10"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/attendance/semester-report", () => {
    it("should return a semester attendance report", async () => {
      const res = await request(app).get(
        "/api/attendance/semester-report?courseId=CS101&semesterStartDate=2024-09-01&semesterEndDate=2024-10-02"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/attendance/all-attendances", () => {
    it("should return all attendances", async () => {
      const res = await request(app).get("/api/attendance/all-attendances");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("studentId");
        expect(res.body[0]).toHaveProperty("courseId");
        expect(res.body[0]).toHaveProperty("action");
      }
    });
  });
});
