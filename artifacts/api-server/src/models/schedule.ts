import mongoose, { Schema, type Document } from "mongoose";

export interface ISchedule extends Document {
  orderNumber?: string;
  description: string;
  origin: string;
  destination: string;
  scheduledDate: string;
  driverName: string;
  vehiclePlate: string;
  cargo: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>(
  {
    orderNumber: { type: String },
    description: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    scheduledDate: { type: String, required: true },
    driverName: { type: String, required: true },
    vehiclePlate: { type: String, required: true },
    cargo: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Schedule = mongoose.model<ISchedule>("Schedule", ScheduleSchema);
