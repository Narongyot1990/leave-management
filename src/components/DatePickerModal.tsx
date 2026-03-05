'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { X, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import 'react-day-picker/style.css';

// Thai months constant (kept for future use)
interface DatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (range: { from: Date; to: Date }) => void;
  onConfirmSingle?: (date: Date) => void;
  initialRange?: { from: Date | undefined; to: Date | undefined };
  initialDate?: Date;
  mode?: 'range' | 'single';
  allowPast?: boolean;
  title?: string;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function DatePickerModal({ open, onClose, onConfirm, onConfirmSingle, initialRange, initialDate, mode = 'range', allowPast = false, title }: DatePickerModalProps) {
  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [singleDate, setSingleDate] = useState<Date | undefined>(initialDate);
  const [selectedText, setSelectedText] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const updateSelectedText = (from?: Date, to?: Date) => {
    if (from && to) {
      const days = dayjs(to).diff(dayjs(from), 'day') + 1;
      setSelectedText(`${dayjs(from).format('D')} - ${dayjs(to).format('D MMM YYYY')} (${days} วัน)`);
    } else if (from) {
      setSelectedText(`${dayjs(from).format('D MMM YYYY')} - ...`);
    } else {
      setSelectedText('');
    }
  };

  useEffect(() => {
    if (mode === 'single' && initialDate) {
      setSingleDate(initialDate);
      setSelectedText(dayjs(initialDate).format('D MMM YYYY'));
    } else if (initialRange?.from && initialRange?.to) {
      setRange(initialRange);
      updateSelectedText(initialRange.from, initialRange.to);
    }
  }, [initialRange, initialDate, open, mode]);

  useEffect(() => {
    setCurrentMonth(new Date());
  }, [open]);

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    if (newRange?.from && newRange?.to) {
      updateSelectedText(newRange.from, newRange.to);
    } else if (newRange?.from) {
      updateSelectedText(newRange.from, undefined);
    }
  };

  const handleConfirm = () => {
    if (mode === 'single' && singleDate) {
      onConfirmSingle?.(singleDate);
      onClose();
    } else if (range?.from && range?.to) {
      onConfirm({ from: range.from, to: range.to });
      onClose();
    }
  };

  const today = new Date();

  const goToPrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="card-neo w-full max-w-md rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title || (mode === 'single' ? 'เลือกวันที่' : 'เลือกวันที่ลา')}</h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              {mode === 'single' ? (
                <DayPicker
                  mode="single"
                  selected={singleDate}
                  onSelect={(date) => {
                    setSingleDate(date || undefined);
                    if (date) setSelectedText(dayjs(date).format('D MMM YYYY'));
                  }}
                  {...(!allowPast ? { fromDate: today } : {})}
                  numberOfMonths={1}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiersClassNames={{
                    selected: 'bg-[var(--accent)] text-white rounded-full',
                    today: 'font-bold text-[var(--accent)]',
                  }}
                  className="rdp-custom"
                />
              ) : (
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={handleSelect}
                  fromDate={today}
                  numberOfMonths={1}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiersClassNames={{
                    selected: 'bg-[var(--accent)] text-white rounded-full',
                    today: 'font-bold text-[var(--accent)]',
                  }}
                  className="rdp-custom"
                />
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-inset)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {selectedText || (mode === 'single' ? 'เลือกวันที่' : 'เลือกวันที่เริ่มต้นและสิ้นสุด')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn btn-secondary flex-1">
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={mode === 'single' ? !singleDate : (!range?.from || !range?.to)}
                className="btn btn-primary flex-1 disabled:opacity-50"
              >
                ยืนยัน
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
