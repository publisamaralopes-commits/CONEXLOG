import mongoose, { Schema, type Document } from "mongoose";

export interface IMural extends Document {
  titulo: string;
  conteudo: string;
  tipo: "operacional" | "aviso" | "pendencia" | "comunicado" | "alerta";
  pinado: boolean;
  urgente: boolean;
  autor: string;
  autorId: string;
  createdAt: Date;
}

const MuralSchema = new Schema<IMural>(
  {
    titulo: { type: String, required: true },
    conteudo: { type: String, required: true },
    tipo: {
      type: String,
      enum: ["operacional", "aviso", "pendencia", "comunicado", "alerta"],
      default: "comunicado",
    },
    pinado: { type: Boolean, default: false },
    urgente: { type: Boolean, default: false },
    autor: { type: String, required: true },
    autorId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Mural = mongoose.model<IMural>("Mural", MuralSchema);
