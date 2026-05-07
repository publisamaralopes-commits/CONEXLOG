import mongoose, { Schema, type Document } from "mongoose";

export interface ILoteItem {
  _id: mongoose.Types.ObjectId;
  cliente: string;
  origem: string;
  cidadeOrigem: string;
  destino: string;
  cidadeDestino: string;
  valorFrete?: string;
  status: "em_transito" | "na_porta" | "carregado";
}

export interface ILote extends Document {
  loteNumber: string;
  items: ILoteItem[];
  createdAt: Date;
}

const LoteItemSchema = new Schema<ILoteItem>({
  cliente: { type: String, required: true },
  origem: { type: String, required: true },
  cidadeOrigem: { type: String, required: true },
  destino: { type: String, required: true },
  cidadeDestino: { type: String, required: true },
  valorFrete: { type: String },
  status: {
    type: String,
    enum: ["em_transito", "na_porta", "carregado"],
    default: "em_transito",
  },
});

const LoteSchema = new Schema<ILote>(
  {
    loteNumber: { type: String, required: true, unique: true },
    items: [LoteItemSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Lote = mongoose.model<ILote>("Lote", LoteSchema);
