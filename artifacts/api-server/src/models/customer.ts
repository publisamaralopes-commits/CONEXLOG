import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
