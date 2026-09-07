"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOtRequest,
  getCurrentSessionUser,
  getOtHistory,
  OtApiClientError,
  type OtHistoryItem,
  type SessionUser,
} from "@/app/ot/_lib/otApiClient";

function formatLocalYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useOtFormController(targetUserId: string | null) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [monthApprovedCount, setMonthApprovedCount] = useState(0);
  const [date, setDate] = useState(() => formatLocalYmd(new Date()));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const submitUserId = useMemo(() => {
    if (!authUser) return null;
    return targetUserId && (authUser.role === "leader" || authUser.role === "admin")
      ? targetUserId
      : authUser.id;
  }, [authUser, targetUserId]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const sessionUser = await getCurrentSessionUser();
        if (!sessionUser) {
          router.push("/login");
          return;
        }

        if (cancelled) return;
        setAuthUser(sessionUser);
        setIsPending(sessionUser.status === "pending");

        const selectedUserId =
          targetUserId && (sessionUser.role === "leader" || sessionUser.role === "admin")
            ? targetUserId
            : sessionUser.id;

        const now = new Date();
        const history = await getOtHistory(selectedUserId);
        if (!cancelled) {
          const approvedThisMonth = history.filter((item) => {
            if (item.status !== "approved") return false;
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
          });
          setMonthApprovedCount(approvedThisMonth.length);
        }
      } catch {
        if (!cancelled) {
          setError("ไม่สามารถเริ่มต้นฟอร์มได้");
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
  }, [router, targetUserId]);

  const handleDateSelect = useCallback((selected: Date) => {
    setDate(formatLocalYmd(selected));
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError("");

      if (!submitUserId) {
        setError("ไม่พบข้อมูลผู้ใช้งาน");
        return;
      }

      if (!date || !reason.trim()) {
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      setLoading(true);
      try {
        await createOtRequest({
          userId: submitUserId,
          date,
          reason: reason.trim(),
        });
        setSuccess(true);
        window.setTimeout(() => {
          router.push("/leave/history?tab=ot");
        }, 1200);
      } catch (err) {
        if (err instanceof OtApiClientError) {
          setError(err.message);
        } else {
          setError("ไม่สามารถส่งคำขอ OT ได้");
        }
      } finally {
        setLoading(false);
      }
    },
    [submitUserId, date, reason, router],
  );

  return {
    authUser,
    monthApprovedCount,
    date,
    reason,
    loading,
    initializing,
    error,
    success,
    showDatePicker,
    isPending,
    setReason,
    setShowDatePicker,
    handleDateSelect,
    submit,
  };
}

export type { OtHistoryItem };
