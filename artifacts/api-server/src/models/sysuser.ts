import mongoose, { Schema, type Document } from "mongoose";

export interface ISysUser extends Document {
  name: string;
  username: string;
  password: string;
  cargo?: string;
  role: "admin" | "employee";
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

const SysUserSchema = new Schema<ISysUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    cargo: { type: String, default: "" },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SysUser = mongoose.model<ISysUser>("SysUser", SysUserSchema);
