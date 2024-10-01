import "dotenv/config";
import express, { Express, Request, Response } from "express";
import connectDB from "./config/database";
import attendanceRouter from "./routes/attendance.routes";

import mongoose from "mongoose";
import cors from "cors";

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());

app.use("/api/attendance", attendanceRouter);

app.get("/", (_req: Request, res: Response) => {
  res.send("API is running...");
});

app.get("/health", async (_req: Request, res: Response) => {
  const dbState =
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbState,
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();
