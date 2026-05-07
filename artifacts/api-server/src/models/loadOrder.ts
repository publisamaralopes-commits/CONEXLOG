import mongoose, { Schema, type Document } from "mongoose";

export interface ILoadOrder extends Document {
  orderNumber: string;
  status: "pending" | "loading" | "in_transit" | "delivered" | "cancelled";
  driver: {
    name: string;
    cpf: string;
    phone: string;
    cnhNumber: string;
    cnhExpiry: string;
    cnhImage?: string;
  };
  vehicle: {
    plate: string;
    type: string;
    model: string;
  };
  cargo: {
    description: string;
    weight: string;
    volume?: string;
    origin: string;
    destination: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoadOrderSchema = new Schema<ILoadOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "loading", "in_transit", "delivered", "cancelled"],
      default: "pending",
    },
    driver: {
      name: { type: String, required: true },
      cpf: { type: String, required: true },
      phone: { type: String, required: true },
      cnhNumber: { type: String, required: true },
      cnhExpiry: { type: String, required: true },
      cnhImage: { type: String },
    },
    vehicle: {
      plate: { type: String, required: true, uppercase: true },
      type: { type: String, required: true },
      model: { type: String, required: true },
    },
    cargo: {
      description: { type: String, required: true },
      weight: { type: String, required: true },
      volume: { type: String },
      origin: { type: String, required: true },
      destination: { type: String, required: true },
      notes: { type: String },
    },
  },
  { timestamps: true },
);

export const LoadOrder = mongoose.model<ILoadOrder>("LoadOrder", LoadOrderSchema);
