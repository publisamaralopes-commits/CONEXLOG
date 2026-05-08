import mongoose, { Schema, type Document } from "mongoose";

export interface ILoadOrder extends Document {
  orderNumber: string;
  status: "pending" | "loading" | "in_transit" | "delivered" | "cancelled";
  driver: {
    nome: string;
    cpf: string;
    cnhNumber: string;
    cnhImage?: string;
  };
  vehicle: {
    placaCavalo: string;
    carreta1: string;
    carreta2: string;
    carreta3: string;
    tipoVeiculo: "graneleiro" | "cacamba";
  };
  cargo: {
    produto: string;
    peso: string;
    cliente: string;
    remetente: string;
    origem: string;
    destinatario: string;
    destino: string;
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
      nome: { type: String, required: true },
      cpf: { type: String, required: true },
      cnhNumber: { type: String, required: true },
      cnhImage: { type: String },
    },
    vehicle: {
      placaCavalo: { type: String, required: true, uppercase: true },
      carreta1: { type: String, required: true, uppercase: true },
      carreta2: { type: String, required: true, uppercase: true },
      carreta3: { type: String, required: true, uppercase: true },
      tipoVeiculo: { type: String, enum: ["graneleiro", "cacamba"], required: true },
    },
    cargo: {
      produto: { type: String, required: true },
      peso: { type: String, required: true },
      cliente: { type: String, required: true },
      remetente: { type: String, required: true },
      origem: { type: String, required: true },
      destinatario: { type: String, required: true },
      destino: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export const LoadOrder = mongoose.model<ILoadOrder>("LoadOrder", LoadOrderSchema);
