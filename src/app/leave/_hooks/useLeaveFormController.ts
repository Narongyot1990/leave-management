"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createLeaveRequest,
  getCurrentSessionUser,
  getUserQuotaById,
  LeaveApiClientError,
  type LeaveQuotaUser,
  type SessionUser,
} from "@/app/leave/_lib/leaveApiClient";

type DateRange = {
  from: Date;
  to: Date;
};

function formatLocalYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useLeaveFormController(targetUserId: string | null) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [requestUser, setRequestUser] = useState<LeaveQuotaUser | null>(null);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const sessionUser = await getCurrentSessionUser();
        if (!sessionUser) {
          const storedUserRaw = localStorage.getItem("driverUser");
          if (!storedUserRaw) {
            router.push("/login");
            return;
          }
          const storedUser = JSON.parse(storedUserRaw) as SessionUser;
          setAuthUser(storedUser);

          const fallbackQuota = await getUserQuotaById(storedUser.id);
          if (!cancelled) {
            setRequestUser(
              fallbackQuota ?? {
                id: storedUser.id,
                lineDisplayName: storedUser.lineDisplayName ?? "",
                role: storedUser.role ?? "driver",
                status: storedUser.status,
                vacationDays: storedUser.vacationDays ?? 10,
                sickDays: storedUser.sickDays ?? 10,
                personalDays: storedUser.personalDays ?? 5,
                unpaidDays: storedUser.unpaidDays ?? 3,
              },
            );
            setIsPending(storedUser.status === "pending");
          }
          return;
        }

        if (cancelled) return;
        setAuthUser(sessionUser);
        setIsPending(sessionUser.status === "pending");

        const selectedUserId =
          targetUserId && (sessionUser.role === "leader" || sessionUser.role === "admin")
            ? targetUserId
            : sessionUser.id;

        const selectedUser = await getUserQuotaById(selectedUserId);
        if (!cancelled) {
          if (!selectedUser) {
            setError("ไม่สามารถโหลดโควต้าวันลาได้");
            return;
          }
          setRequestUser(selectedUser);
        }
      } catch {
        if (!cancelled) {
          setError("ไม่สามารถเริ่มต้นฟอร์มลาได้");
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

  const handleDateSelect = useCallback((range: DateRange) => {
    const start = formatLocalYmd(range.from);
    const end = formatLocalYmd(range.to);
    setStartDate(start);
    setEndDate(end);
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError("");

      if (!requestUser) {
        setError("ไม่พบข้อมูลผู้ใช้งาน");
        return;
      }

      if (!leaveType || !startDate || !endDate || !reason.trim()) {
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        setError("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
        return;
      }

      setLoading(true);
      try {
        await createLeaveRequest({
          userId: requestUser.id,
          leaveType: leaveType as "vacation" | "sick" | "personal" | "unpaid",
          startDate,
          endDate,
          reason: reason.trim(),
        });
        setSuccess(true);
        window.setTimeout(() => {
          router.push("/leave/history");
        }, 1200);
      } catch (err) {
        if (err instanceof LeaveApiClientError) {
          setError(err.message);
        } else {
          setError("ไม่สามารถส่งคำขอลาได้");
        }
      } finally {
        setLoading(false);
      }
    },
    [requestUser, leaveType, startDate, endDate, reason, router],
  );

  return {
    authUser,
    requestUser,
    leaveType,
    startDate,
    endDate,
    reason,
    loading,
    initializing,
    error,
    success,
    showDatePicker,
    isPending,
    setLeaveType,
    setReason,
    setShowDatePicker,
    handleDateSelect,
    submit,
  };
}
