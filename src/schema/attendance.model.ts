import { Schema, model, models } from "mongoose";

const AttendanceSchema = new Schema(
  {
    studentId: { type: String, required: true },
    courseId: { type: String, required: true },
    action: { type: String, required: true, enum: ["in", "out"] },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

const Attendance = models.Attendance || model("Attendance", AttendanceSchema);

export default Attendance;
