import mongoose, { Schema, type Document } from "mongoose";

export interface ISysUser extends Document {
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  active: boolean;
  createdAt: Date;
}

const SysUserSchema = new Schema<ISysUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "operator", "viewer"], default: "operator" },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SysUser = mongoose.model<ISysUser>("SysUser", SysUserSchema);
