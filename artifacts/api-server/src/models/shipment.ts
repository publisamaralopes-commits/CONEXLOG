import mongoose, { Schema, type Document } from "mongoose";

export interface IShipment extends Document {
  orderNumber: string;
  driverName: string;
  vehiclePlate: string;
  origin: string;
  destination: string;
  currentLocation: string;
  status: "waiting" | "loading" | "in_transit" | "delivered";
  estimatedArrival?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    orderNumber: { type: String, required: true },
    driverName: { type: String, required: true },
    vehiclePlate: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    currentLocation: { type: String, required: true },
    status: {
      type: String,
      enum: ["waiting", "loading", "in_transit", "delivered"],
      default: "waiting",
    },
    estimatedArrival: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Shipment = mongoose.model<IShipment>("Shipment", ShipmentSchema);
