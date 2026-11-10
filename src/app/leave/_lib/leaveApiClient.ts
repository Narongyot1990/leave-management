import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  lineDisplayName: z.string().optional(),
  name: z.string().optional(),
  surname: z.string().optional(),
  role: z.enum(["driver", "leader", "admin"]).optional(),
  status: z.string().optional(),
  vacationDays: z.number().optional(),
  sickDays: z.number().optional(),
  personalDays: z.number().optional(),
  unpaidDays: z.number().optional(),
});

const authMeResponseSchema = z.object({
  success: z.literal(true),
  user: userSchema,
});

const usersListResponseSchema = z.object({
  success: z.literal(true),
  users: z.array(
    z.object({
      _id: z.string(),
      lineDisplayName: z.string().optional(),
      name: z.string().optional(),
      surname: z.string().optional(),
      role: z.enum(["driver", "leader", "admin"]).optional(),
      status: z.string().optional(),
      vacationDays: z.number().optional(),
      sickDays: z.number().optional(),
      personalDays: z.number().optional(),
      unpaidDays: z.number().optional(),
    }),
  ),
});

const createLeaveSuccessSchema = z.object({
  success: z.literal(true),
});

const leaveRequestSchema = z.object({
  _id: z.string(),
  leaveType: z.string(),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  reason: z.string(),
  status: z.string(),
  rejectedReason: z.string().optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  createdAt: z.union([z.string(), z.date()]),
  approvedBy: z
    .object({
      _id: z.string(),
      name: z.string().optional(),
      surname: z.string().optional(),
      lineDisplayName: z.string().optional(),
      lineProfileImage: z.string().optional(),
      performanceTier: z.string().optional(),
      branch: z.string().optional(),
      role: z.string().optional(),
    })
    .optional(),
});

const leaveHistoryResponseSchema = z.object({
  success: z.literal(true),
  requests: z.array(leaveRequestSchema),
});

const cancelLeaveResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  remainingQuota: z
    .object({
      vacationDays: z.number().optional(),
      sickDays: z.number().optional(),
      personalDays: z.number().optional(),
      unpaidDays: z.number().optional(),
    })
    .optional(),
});

const apiErrorSchema = z.object({
  success: z.literal(false).optional(),
  error: z.string().optional(),
});

export type SessionUser = z.infer<typeof userSchema>;

export type LeaveQuotaUser = {
  id: string;
  lineDisplayName: string;
  role: "driver" | "leader" | "admin";
  status?: string;
  vacationDays: number;
  sickDays: number;
  personalDays: number;
  unpaidDays: number;
};

export type CreateLeavePayload = {
  userId: string;
  leaveType: "vacation" | "sick" | "personal" | "unpaid";
  startDate: string;
  endDate: string;
  reason: string;
};

export type LeaveHistoryItem = z.infer<typeof leaveRequestSchema>;

export type LeaveCancelResult = z.infer<typeof cancelLeaveResponseSchema>;

export class LeaveApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaveApiClientError";
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new LeaveApiClientError(parsed.success ? parsed.data.error ?? "Request failed" : "Request failed");
  }

  return json;
}

function mapUser(source: z.infer<typeof usersListResponseSchema>["users"][number]): LeaveQuotaUser {
  return {
    id: source._id,
    lineDisplayName: source.name && source.surname ? `${source.name} ${source.surname}` : source.lineDisplayName ?? "",
    role: source.role ?? "driver",
    status: source.status,
    vacationDays: source.vacationDays ?? 10,
    sickDays: source.sickDays ?? 10,
    personalDays: source.personalDays ?? 5,
    unpaidDays: source.unpaidDays ?? 3,
  };
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  try {
    const json = await fetchJson("/api/auth/me");
    const parsed = authMeResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.user : null;
  } catch {
    return null;
  }
}

export async function getUserQuotaById(userId: string): Promise<LeaveQuotaUser | null> {
  const json = await fetchJson(`/api/users?id=${encodeURIComponent(userId)}`);
  const parsed = usersListResponseSchema.safeParse(json);
  if (!parsed.success || parsed.data.users.length === 0) {
    return null;
  }
  return mapUser(parsed.data.users[0]);
}

export async function createLeaveRequest(payload: CreateLeavePayload): Promise<void> {
  const json = await fetchJson("/api/leave", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const parsed = createLeaveSuccessSchema.safeParse(json);
  if (!parsed.success) {
    throw new LeaveApiClientError("Failed to create leave request");
  }
}

export async function getLeaveHistory(userId: string): Promise<LeaveHistoryItem[]> {
  const json = await fetchJson(`/api/leave?userId=${encodeURIComponent(userId)}`);
  const parsed = leaveHistoryResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new LeaveApiClientError("Failed to load leave history");
  }

  return parsed.data.requests;
}

export async function cancelLeaveRequest(userId: string, leaveId: string): Promise<LeaveCancelResult> {
  const json = await fetchJson(`/api/leave/${encodeURIComponent(leaveId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  const parsed = cancelLeaveResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new LeaveApiClientError("Failed to cancel leave request");
  }

  return parsed.data;
}
