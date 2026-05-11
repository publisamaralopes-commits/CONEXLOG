import mongoose, { Schema, type Document } from "mongoose";

export interface ILoteHistory extends Document {
  loteId: string;
  loteNumber: string;
  filialId: string;
  filialName: string;
  cliente: string;
  field: string;
  oldVal: number;
  newVal: number;
  delta: number;
  updatedBy: string;
  updatedByName: string;
  timestamp: Date;
}

const LoteHistorySchema = new Schema<ILoteHistory>(
  {
    loteId: { type: String, required: true },
    loteNumber: { type: String, required: true },
    filialId: { type: String, default: "" },
    filialName: { type: String, default: "" },
    cliente: { type: String, default: "" },
    field: { type: String, required: true },
    oldVal: { type: Number, default: 0 },
    newVal: { type: Number, default: 0 },
    delta: { type: Number, default: 0 },
    updatedBy: { type: String, default: "" },
    updatedByName: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  {},
);

LoteHistorySchema.index({ loteId: 1, timestamp: -1 });
LoteHistorySchema.index({ filialId: 1, timestamp: -1 });
LoteHistorySchema.index({ updatedBy: 1, timestamp: -1 });
LoteHistorySchema.index({ timestamp: -1 });

export const LoteHistory = mongoose.model<ILoteHistory>("LoteHistory", LoteHistorySchema);
