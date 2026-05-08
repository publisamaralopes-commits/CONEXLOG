import mongoose, { Schema, type Document } from "mongoose";

export interface ILote extends Document {
  loteNumber: string;
  cliente: string;
  origem: string;
  cidadeOrigem: string;
  destino: string;
  cidadeDestino: string;
  valorFrete?: string;
  nPorta: number;
  emTransito: number;
  carregado: number;
  createdAt: Date;
}

const LoteSchema = new Schema<ILote>(
  {
    loteNumber: { type: String, required: true, unique: true },
    cliente: { type: String, required: true },
    origem: { type: String, required: true },
    cidadeOrigem: { type: String, required: true },
    destino: { type: String, required: true },
    cidadeDestino: { type: String, required: true },
    valorFrete: { type: String },
    nPorta: { type: Number, default: 0, min: 0 },
    emTransito: { type: Number, default: 0, min: 0 },
    carregado: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Lote = mongoose.model<ILote>("Lote", LoteSchema);
