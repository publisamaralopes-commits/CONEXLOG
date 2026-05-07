import mongoose, { Schema, type Document } from "mongoose";

export interface IFleet extends Document {
  plate: string;
  type: string;
  vehicleModel: string;
  year: string;
  capacity: string;
  status: "available" | "in_use" | "maintenance";
  createdAt: Date;
}

const FleetSchema = new Schema<IFleet>(
  {
    plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    year: { type: String, required: true },
    capacity: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "in_use", "maintenance"],
      default: "available",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Fleet = mongoose.model<IFleet>("Fleet", FleetSchema);
