import { z } from "zod";

const objectIdOrLiteral = z.string().trim().min(1);
const calendarDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const LeaveTypeSchema = z.enum(["vacation", "sick", "personal", "unpaid"]);
export const LeaveStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled"]);

export const LeaveQuerySchema = z.object({
  userId: objectIdOrLiteral.optional(),
  status: LeaveStatusSchema.optional(),
  branch: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const CreateLeaveSchema = z.object({
  userId: objectIdOrLiteral,
  leaveType: LeaveTypeSchema,
  startDate: calendarDateString,
  endDate: calendarDateString,
  reason: z.string().trim().min(3).max(1000),
}).superRefine((data, ctx) => {
  if (new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after start date",
    });
  }
});

export const CancelLeaveSchema = z.object({
  userId: objectIdOrLiteral,
});

export const ReviewLeaveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectedReason: z.string().trim().min(3).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "rejected" && !data.rejectedReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectedReason"],
      message: "Rejected reason is required when rejecting a leave request",
    });
  }
});

export type LeaveQueryInput = z.infer<typeof LeaveQuerySchema>;
export type CreateLeaveInput = z.infer<typeof CreateLeaveSchema>;
export type CancelLeaveInput = z.infer<typeof CancelLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof ReviewLeaveSchema>;
