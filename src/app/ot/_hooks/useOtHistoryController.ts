"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelOtRequest,
  getCurrentSessionUser,
  getOtHistory,
  OtApiClientError,
  type OtHistoryItem,
  type SessionUser,
} from "@/app/ot/_lib/otApiClient";
import type { ProfileUser } from "@/components/ProfileModal";

export function useOtHistoryController() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<OtHistoryItem[]>([]);
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
          router.push("/login");
          return;
        }
        if (!cancelled) {
          setUser(sessionUser);
        }
      } catch {
        if (!cancelled) {
          setError("ไม่สามารถเริ่มต้นหน้าประวัติ OT ได้");
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
      const history = await getOtHistory(user.id);
      setRequests(history);
    } catch (err) {
      if (err instanceof OtApiClientError) {
        setError(err.message);
      } else {
        setError("ไม่สามารถโหลดประวัติ OT ได้");
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
    async (otId: string) => {
      if (!user) return false;
      setCancellingId(otId);
      setError("");
      try {
        await cancelOtRequest(user.id, otId);
        setRequests((prev) => prev.filter((request) => request._id !== otId));
        return true;
      } catch (err) {
        if (err instanceof OtApiClientError) {
          setError(err.message);
        } else {
          setError("ไม่สามารถยกเลิกคำขอ OT ได้");
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
