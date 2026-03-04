'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { Camera, Car, CalendarDays, Clock, CheckCircle2, AlertCircle, ImageIcon, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

dayjs.locale('th');

interface DriverUser {
  id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  status: string;
}

const activityTypes = [
  { key: 'car-wash', label: 'ล้างรถ', icon: Car },
];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

const timeSlots = generateTimeSlots();

function resizeImage(file: File, maxDimension = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context error'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Blob conversion error'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export default function CarWashPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<DriverUser | null>(null);

  const [activityType, setActivityType] = useState('car-wash');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [activityDate, setActivityDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [activityTime, setActivityTime] = useState(() => {
    const now = dayjs();
    const m = now.minute() < 30 ? '00' : '30';
    return `${String(now.hour()).padStart(2, '0')}:${m}`;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file);
      setImageFile(resized);
      setImagePreview(URL.createObjectURL(resized));
      setError('');
    } catch {
      setError('ไม่สามารถประมวลผลรูปภาพได้');
    }
  };

  const handleSubmit = async () => {
    if (!user || !imageFile) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('image', imageFile, 'activity.jpg');
      formData.append('userId', user.id);
      formData.append('activityType', activityType);
      formData.append('caption', caption);
      formData.append('activityDate', activityDate);
      formData.append('activityTime', activityTime);

      const res = await fetch('/api/car-wash', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setImagePreview(null);
        setImageFile(null);
        setCaption('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!imageFile && !!activityDate && !!activityTime && !loading;

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="บันทึกกิจกรรม" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card p-4 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <span className="text-fluid-sm font-medium" style={{ color: 'var(--success)' }}>บันทึกกิจกรรมสำเร็จ!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Section 1: Activity Type */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <label className="block text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                เลือกกิจกรรม
              </label>
              <div className="grid grid-cols-1 gap-2">
                {activityTypes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = activityType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActivityType(t.key)}
                      className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] transition-all text-left"
                      style={{
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-inset)',
                        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                      <span className="text-fluid-sm font-medium">{t.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Section 2: Image Upload */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="card p-5">
              <label className="block text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                รูปภาพ
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-[var(--radius-md)] object-contain max-h-[300px]"
                    style={{ background: 'var(--bg-inset)' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 btn btn-secondary text-fluid-xs flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    เปลี่ยนรูป
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-md)] border-2 border-dashed transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-fluid-sm font-medium">แตะเพื่อถ่ายรูปหรืออัปโหลด</p>
                    <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>รูปจะถูก resize อัตโนมัติ</p>
                  </div>
                </button>
              )}
            </motion.div>

            {/* Section 3: Caption */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5">
              <label className="block text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                รายละเอียด <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(ไม่บังคับ)</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="เช่น ล้างรถเรียบร้อย ทำความสะอาดภายใน..."
              />
            </motion.div>

            {/* Section 4: Date & Time */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="card p-5">
              <label className="block text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                วันที่และเวลาที่ทำกิจกรรม
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-fluid-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    max={dayjs().format('YYYY-MM-DD')}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-fluid-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    เวลา
                  </label>
                  <select
                    value={activityTime}
                    onChange={(e) => setActivityTime(e.target.value)}
                    className="input"
                  >
                    {timeSlots.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-fluid-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {dayjs(activityDate).format('D MMMM YYYY')} เวลา {activityTime} น.
              </p>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="btn btn-primary w-full py-3.5 text-fluid-sm font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    บันทึกกิจกรรม
                  </span>
                )}
              </button>
            </motion.div>

          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}
