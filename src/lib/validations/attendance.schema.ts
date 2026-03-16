import { z } from 'zod';

export const ClockInSchema = z.object({
  type: z.enum(['in', 'out']),
  location: z.object({
    lat: z.number(),
    lon: z.number()
  }),
  branchCode: z.string(),
  branchLocation: z.object({
    lat: z.number(),
    lon: z.number()
  }).optional(),
  radius: z.number().optional()
});

export const AttendanceQuerySchema = z.object({
  userId: z.string().optional(),
  branch: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  range: z.enum(['day', 'week', 'month']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userName: z.string().optional()
});

export const PatchAttendanceSchema = z.object({
  id: z.string(),
  timestamp: z.string().optional(),
  type: z.enum(['in', 'out']).optional(),
  branch: z.string().optional()
});
