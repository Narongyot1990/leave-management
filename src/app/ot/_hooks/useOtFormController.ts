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

function resizeImage(file: File, maxDimension = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
          else { width = Math.round((width * maxDimension) / height); height = maxDimension; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context error'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Blob conversion error'))), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export function useOtFormController(targetUserId: string | null) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [monthApprovedCount, setMonthApprovedCount] = useState(0);
  const [date, setDate] = useState(() => formatLocalYmd(new Date()));
  const [claimType, setClaimType] = useState("ot");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  const handlePhotoSelect = useCallback(async (file: File) => {
    setError("");
    try {
      const resized = await resizeImage(file);
      setPhotoFile(resized);
      setPhotoPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(resized);
      });
    } catch {
      setError("ไม่สามารถประมวลผลรูปภาพได้");
    }
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setPhotoFile(null);
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError("");

      if (!submitUserId) {
        setError("ไม่พบข้อมูลผู้ใช้งาน");
        return;
      }

      if (!date || !claimType || !reason.trim()) {
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      if (!photoFile) {
        setError("กรุณาแนบรูปใบงาน");
        return;
      }

      setLoading(true);
      try {
        await createOtRequest({
          userId: submitUserId,
          date,
          claimType,
          reason: reason.trim(),
          photo: photoFile,
        });
        setSuccess(true);
        window.setTimeout(() => {
          router.push("/leave/history?tab=ot");
        }, 1200);
      } catch (err) {
        if (err instanceof OtApiClientError) {
          setError(err.message);
        } else {
          setError("ไม่สามารถส่งคำขอได้");
        }
      } finally {
        setLoading(false);
      }
    },
    [submitUserId, date, claimType, reason, photoFile, router],
  );

  return {
    authUser,
    monthApprovedCount,
    date,
    claimType,
    reason,
    loading,
    initializing,
    error,
    success,
    showDatePicker,
    isPending,
    photoPreview,
    setClaimType,
    setReason,
    setShowDatePicker,
    handleDateSelect,
    handlePhotoSelect,
    removePhoto,
    submit,
  };
}

export type { OtHistoryItem };
