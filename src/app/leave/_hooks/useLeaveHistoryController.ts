"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelLeaveRequest,
  getCurrentSessionUser,
  getLeaveHistory,
  getUserQuotaById,
  LeaveApiClientError,
  type LeaveHistoryItem,
  type LeaveQuotaUser,
} from "@/app/leave/_lib/leaveApiClient";
import type { ProfileUser } from "@/components/ProfileModal";

type QuotaPatch = {
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  unpaidDays?: number;
};

function applyQuota(user: LeaveQuotaUser, quota: QuotaPatch | undefined): LeaveQuotaUser {
  if (!quota) return user;
  return {
    ...user,
    vacationDays: quota.vacationDays ?? user.vacationDays,
    sickDays: quota.sickDays ?? user.sickDays,
    personalDays: quota.personalDays ?? user.personalDays,
    unpaidDays: quota.unpaidDays ?? user.unpaidDays,
  };
}

export function useLeaveHistoryController() {
  const router = useRouter();
  const [user, setUser] = useState<LeaveQuotaUser | null>(null);
  const [requests, setRequests] = useState<LeaveHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const sessionUser = await getCurrentSessionUser();

        if (!sessionUser) {
          const storedRaw = localStorage.getItem("driverUser");
          if (!storedRaw) {
            router.push("/login");
            return;
          }
          const stored = JSON.parse(storedRaw) as LeaveQuotaUser;
          if (!cancelled) {
            setUser({
              ...stored,
              vacationDays: stored.vacationDays ?? 10,
              sickDays: stored.sickDays ?? 10,
              personalDays: stored.personalDays ?? 5,
              unpaidDays: stored.unpaidDays ?? 3,
            });
          }
          return;
        }

        const resolvedUser = await getUserQuotaById(sessionUser.id);
        if (!cancelled) {
          if (!resolvedUser) {
            setError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
            return;
          }
          setUser(resolvedUser);
        }
      } catch {
        if (!cancelled) {
          setError("ไม่สามารถเริ่มต้นหน้าประวัติลาได้");
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const history = await getLeaveHistory(user.id);
      setRequests(history);
    } catch (err) {
      if (err instanceof LeaveApiClientError) {
        setError(err.message);
      } else {
        setError("ไม่สามารถโหลดประวัติการลาได้");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshHistory();
  }, [user, refreshHistory]);

  const cancelRequest = useCallback(
    async (leaveId: string) => {
      if (!user) return false;
      setCancellingId(leaveId);
      setError("");
      try {
        const result = await cancelLeaveRequest(user.id, leaveId);
        setRequests((prev) => prev.filter((request) => request._id !== leaveId));
        if (result.remainingQuota) {
          const next = applyQuota(user, result.remainingQuota);
          setUser(next);
          localStorage.setItem("driverUser", JSON.stringify(next));
        }
        return true;
      } catch (err) {
        if (err instanceof LeaveApiClientError) {
          setError(err.message);
        } else {
          setError("ไม่สามารถยกเลิกใบลาได้");
        }
        return false;
      } finally {
        setCancellingId(null);
      }
    },
    [user],
  );

  const openApproverProfile = useCallback((target: ProfileUser) => {
    setProfileUser(target);
    setShowProfile(true);
  }, []);

  return {
    user,
    requests,
    loading,
    initializing,
    error,
    cancellingId,
    profileUser,
    showProfile,
    setShowProfile,
    refreshHistory,
    cancelRequest,
    openApproverProfile,
  };
}
