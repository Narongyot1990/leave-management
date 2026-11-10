import { z } from "zod";
import { PERFORMANCE_TIERS } from "@/lib/profile-tier";

const objectIdString = z.string().trim().regex(/^[a-f\d]{24}$/i, "Expected ObjectId");
const roleSchema = z.enum(["driver", "leader", "admin"]);
const statusSchema = z.enum(["pending", "active"]);

export const UserListQuerySchema = z.object({
  status: statusSchema.optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
  branch: z.string().trim().min(1).max(100).optional(),
  role: roleSchema.optional(),
  id: objectIdString.optional(),
});

export const UpdateUserSchema = z.object({
  userId: objectIdString,
  name: z.string().trim().min(1).max(100).optional(),
  surname: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  employeeId: z.string().trim().min(1).max(50).optional(),
  linePublicId: z.string().trim().min(1).max(100).nullable().optional(),
  branch: z.string().trim().min(1).max(100).nullable().optional(),
  status: statusSchema.optional(),
  role: roleSchema.optional(),
  vacationDays: z.number().int().min(0).max(365).optional(),
  sickDays: z.number().int().min(0).max(365).optional(),
  personalDays: z.number().int().min(0).max(365).optional(),
  unpaidDays: z.number().int().min(0).max(365).optional(),
  performanceTier: z.enum(PERFORMANCE_TIERS).optional(),
});

export const DeleteUserSchema = z.object({
  id: objectIdString,
});

export const UserByIdSchema = z.object({
  id: objectIdString,
});

export type UserListQueryInput = z.infer<typeof UserListQuerySchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type DeleteUserInput = z.infer<typeof DeleteUserSchema>;
export type UserByIdInput = z.infer<typeof UserByIdSchema>;
