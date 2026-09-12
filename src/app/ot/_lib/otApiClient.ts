import { z } from "zod";

const authMeResponseSchema = z.object({
  success: z.literal(true),
  user: z.object({
    id: z.string(),
    lineDisplayName: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
    role: z.enum(["driver", "leader", "admin"]).optional(),
    status: z.string().optional(),
  }),
});

const createOtSuccessSchema = z.object({
  success: z.literal(true),
});

const otRequestSchema = z.object({
  _id: z.string(),
  date: z.union([z.string(), z.date()]),
  claimType: z.string(),
  reason: z.string(),
  photoUrl: z.string(),
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

const otHistoryResponseSchema = z.object({
  success: z.literal(true),
  requests: z.array(otRequestSchema),
});

const cancelOtResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

const apiErrorSchema = z.object({
  success: z.literal(false).optional(),
  error: z.string().optional(),
});

export type SessionUser = z.infer<typeof authMeResponseSchema>["user"];

export type CreateOtPayload = {
  userId: string;
  date: string;
  claimType: string;
  reason: string;
  photo: Blob;
};

export type OtHistoryItem = z.infer<typeof otRequestSchema>;

export class OtApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtApiClientError";
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
    throw new OtApiClientError(parsed.success ? parsed.data.error ?? "Request failed" : "Request failed");
  }

  return json;
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

export async function createOtRequest(payload: CreateOtPayload): Promise<void> {
  const formData = new FormData();
  formData.append("userId", payload.userId);
  formData.append("date", payload.date);
  formData.append("claimType", payload.claimType);
  formData.append("reason", payload.reason);
  formData.append("photo", payload.photo, "ot-photo.jpg");

  const response = await fetch("/api/ot", {
    method: "POST",
    body: formData,
  });

  const json = await response.json();
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new OtApiClientError(parsed.success ? parsed.data.error ?? "Request failed" : "Request failed");
  }

  const parsed = createOtSuccessSchema.safeParse(json);
  if (!parsed.success) {
    throw new OtApiClientError("Failed to create OT request");
  }
}

export async function getOtHistory(userId: string): Promise<OtHistoryItem[]> {
  const json = await fetchJson(`/api/ot?userId=${encodeURIComponent(userId)}`);
  const parsed = otHistoryResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new OtApiClientError("Failed to load OT history");
  }

  return parsed.data.requests;
}

export async function cancelOtRequest(userId: string, otId: string): Promise<void> {
  const json = await fetchJson(`/api/ot/${encodeURIComponent(otId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  const parsed = cancelOtResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new OtApiClientError("Failed to cancel OT request");
  }
}
