import mongoose, { Schema, type Document } from "mongoose";

export interface IFilial extends Document {
  name: string;
  active: boolean;
  createdAt: Date;
}

const FilialSchema = new Schema<IFilial>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Filial = mongoose.model<IFilial>("Filial", FilialSchema);
