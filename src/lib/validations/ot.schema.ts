import { z } from "zod";

const objectIdOrLiteral = z.string().trim().min(1);
const calendarDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const timeString = z.string().regex(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, "Expected HH:mm");

export const OtStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled"]);
export const OtClaimTypeSchema = z.enum(["ot", "holiday_work", "extra_trip", "night_shift"]);

export const OtQuerySchema = z.object({
  userId: objectIdOrLiteral.optional(),
  status: OtStatusSchema.optional(),
  claimType: OtClaimTypeSchema.optional(),
  branch: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const CreateOtSchema = z.object({
  userId: objectIdOrLiteral,
  date: calendarDateString,
  claimType: OtClaimTypeSchema,
  startTime: timeString.optional(),
  endTime: timeString.optional(),
  reason: z.string().trim().min(3).max(500),
}).superRefine((data, ctx) => {
  if (Boolean(data.startTime) !== Boolean(data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "Both startTime and endTime are required together",
    });
  }
});

export const CancelOtSchema = z.object({
  userId: objectIdOrLiteral,
});

export const ReviewOtSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectedReason: z.string().trim().min(3).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "rejected" && !data.rejectedReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectedReason"],
      message: "Rejected reason is required when rejecting an OT request",
    });
  }
});

export const BatchApproveOtSchema = z.object({
  ids: z.array(objectIdOrLiteral).min(1).max(200),
});

export type OtQueryInput = z.infer<typeof OtQuerySchema>;
export type CreateOtInput = z.infer<typeof CreateOtSchema>;
export type CancelOtInput = z.infer<typeof CancelOtSchema>;
export type ReviewOtInput = z.infer<typeof ReviewOtSchema>;
export type BatchApproveOtInput = z.infer<typeof BatchApproveOtSchema>;
