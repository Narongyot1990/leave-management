'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Users } from 'lucide-react';

interface DriverOption {
  _id: string;
  lineDisplayName: string;
  name?: string;
  surname?: string;
}

interface AdminCarWashFiltersPanelProps {
  open: boolean;
  drivers: DriverOption[];
  selectedDriver: string;
  startDate: string;
  endDate: string;
  hasFilters: boolean;
  onSelectedDriverChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function AdminCarWashFiltersPanel({
  open,
  drivers,
  selectedDriver,
  startDate,
  endDate,
  hasFilters,
  onSelectedDriverChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: AdminCarWashFiltersPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="card p-4 space-y-3 overflow-hidden"
        >
          <div>
            <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Users className="w-3.5 h-3.5 inline mr-1" />
              เลือกพนักงาน
            </label>
            <select value={selectedDriver} onChange={(event) => onSelectedDriverChange(event.target.value)} className="input">
              <option value="">ทั้งหมด</option>
              {drivers.map((driver) => (
                <option key={driver._id} value={driver._id}>
                  {driver.name && driver.surname ? `${driver.name} ${driver.surname}` : driver.lineDisplayName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                ตั้งแต่
              </label>
              <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                ถึง
              </label>
              <input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} className="input" />
            </div>
          </div>
          {hasFilters && (
            <button onClick={onClearFilters} className="btn btn-secondary w-full text-fluid-xs">ล้างตัวกรอง</button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
