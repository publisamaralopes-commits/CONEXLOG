import mongoose, { Schema, type Document } from "mongoose";

export interface IFleet extends Document {
  cliente: string;
  origemDestino: string;
  placaCavalo: string;
  placaCarreta1?: string;
  placaCarreta2?: string;
  placaCarreta3?: string;
  statusGR: "liberado" | "pendente" | "gr" | "cco" | "nenhum";
  statusCarregamento: "manifestado" | "porta" | "troca_nf" | "nenhum";
  obs?: string;
  createdAt: Date;
}

const FleetSchema = new Schema<IFleet>(
  {
    cliente: { type: String, required: true },
    origemDestino: { type: String, required: true },
    placaCavalo: { type: String, required: true, uppercase: true, trim: true },
    placaCarreta1: { type: String, uppercase: true, trim: true },
    placaCarreta2: { type: String, uppercase: true, trim: true },
    placaCarreta3: { type: String, uppercase: true, trim: true },
    statusGR: {
      type: String,
      enum: ["liberado", "pendente", "gr", "cco", "nenhum"],
      default: "nenhum",
    },
    statusCarregamento: {
      type: String,
      enum: ["manifestado", "porta", "troca_nf", "nenhum"],
      default: "nenhum",
    },
    obs: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Fleet = mongoose.model<IFleet>("Fleet", FleetSchema);
