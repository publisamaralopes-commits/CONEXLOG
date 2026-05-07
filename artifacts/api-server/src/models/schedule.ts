import mongoose, { Schema, type Document } from "mongoose";

export interface ISchedule extends Document {
  cliente: string;
  retirada: string;
  cidadeRetirada: string;
  destinatario: string;
  cidadeDestino: string;
  terminal: string;
  produto: string;
  numeroPGR: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>(
  {
    cliente: { type: String, required: true },
    retirada: { type: String, required: true },
    cidadeRetirada: { type: String, required: true },
    destinatario: { type: String, required: true },
    cidadeDestino: { type: String, required: true },
    terminal: { type: String, required: true },
    produto: { type: String, required: true },
    numeroPGR: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Schedule = mongoose.model<ISchedule>("Schedule", ScheduleSchema);
