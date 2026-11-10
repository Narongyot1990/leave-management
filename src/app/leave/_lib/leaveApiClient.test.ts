import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LeaveApiClientError,
  cancelLeaveRequest,
  createLeaveRequest,
  getCurrentSessionUser,
  getLeaveHistory,
  getUserQuotaById,
} from "@/app/leave/_lib/leaveApiClient";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("leaveApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns current session user when /api/auth/me succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          user: { id: "u-1", role: "driver", lineDisplayName: "Driver One" },
        }),
      ),
    );

    const user = await getCurrentSessionUser();

    expect(user?.id).toBe("u-1");
  });

  it("returns null for current session user when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const user = await getCurrentSessionUser();

    expect(user).toBeNull();
  });

  it("maps user quota fields from /api/users response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          users: [{ _id: "u-2", role: "driver", lineDisplayName: "Driver Two", vacationDays: 5 }],
        }),
      ),
    );

    const quotaUser = await getUserQuotaById("u-2");

    expect(quotaUser).toEqual({
      id: "u-2",
      role: "driver",
      lineDisplayName: "Driver Two",
      status: undefined,
      vacationDays: 5,
      sickDays: 10,
      personalDays: 5,
      unpaidDays: 3,
    });
  });

  it("throws LeaveApiClientError when createLeaveRequest returns non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            error: "INSUFFICIENT_QUOTA",
          },
          400,
        ),
      ),
    );

    await expect(
      createLeaveRequest({
        userId: "u-3",
        leaveType: "vacation",
        startDate: "2026-03-20",
        endDate: "2026-03-20",
        reason: "Vacation",
      }),
    ).rejects.toThrow(LeaveApiClientError);
  });

  it("loads leave history list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          requests: [
            {
              _id: "leave-1",
              leaveType: "vacation",
              startDate: "2026-03-01",
              endDate: "2026-03-01",
              reason: "Vacation",
              status: "pending",
              createdAt: "2026-02-20T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    const items = await getLeaveHistory("u-4");
    expect(items).toHaveLength(1);
    expect(items[0]._id).toBe("leave-1");
  });

  it("returns cancel result payload from cancelLeaveRequest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          remainingQuota: { vacationDays: 10, sickDays: 8, personalDays: 5 },
        }),
      ),
    );

    const result = await cancelLeaveRequest("u-5", "leave-2");

    expect(result.remainingQuota?.vacationDays).toBe(10);
  });
});
