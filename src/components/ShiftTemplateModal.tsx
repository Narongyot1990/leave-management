'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Save, Clock } from 'lucide-react';

export interface ShiftTemplate {
  _id: string;
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const emptyForm = () => ({ name: '', startHour: 8, startMinute: 0, endHour: 17, endMinute: 0, color: '#6366f1' });

export default function ShiftTemplateModal({ open, onClose, onChanged }: Props) {
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shifts');
      const data = await res.json();
      if (data.success) setShifts(data.shifts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchShifts(); }, [open, fetchShifts]);

  const handleEdit = (s: ShiftTemplate) => {
    setEditId(s._id);
    setForm({ name: s.name, startHour: s.startHour, startMinute: s.startMinute, endHour: s.endHour, endMinute: s.endMinute, color: s.color });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editId ? `/api/shifts/${editId}` : '/api/shifts';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        await fetchShifts();
        onChanged();
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm());
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบ Shift Template นี้?')) return;
    await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    await fetchShifts();
    onChanged();
  };

  const fmtTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <h2 className="text-[13px] font-black tracking-tighter">SHIFT TEMPLATES</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-inset)] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="rounded-xl p-4 space-y-3 overflow-hidden"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                      {editId ? 'แก้ไข Template' : 'Template ใหม่'}
                    </p>

                    {/* Name */}
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">ชื่อ Shift</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="เช่น เช้า, กลางคืน, บ่าย..."
                        className="w-full h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-3 text-[12px] font-bold focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">เวลาเข้า</label>
                        <div className="flex gap-1.5">
                          <select
                            value={form.startHour}
                            onChange={e => setForm(f => ({ ...f, startHour: Number(e.target.value) }))}
                            className="flex-1 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 text-[12px] font-bold focus:border-indigo-500 outline-none"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{pad(i)}</option>
                            ))}
                          </select>
                          <select
                            value={form.startMinute}
                            onChange={e => setForm(f => ({ ...f, startMinute: Number(e.target.value) }))}
                            className="flex-1 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 text-[12px] font-bold focus:border-indigo-500 outline-none"
                          >
                            {[0, 15, 30, 45].map(m => <option key={m} value={m}>{pad(m)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">เวลาออก</label>
                        <div className="flex gap-1.5">
                          <select
                            value={form.endHour}
                            onChange={e => setForm(f => ({ ...f, endHour: Number(e.target.value) }))}
                            className="flex-1 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 text-[12px] font-bold focus:border-indigo-500 outline-none"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{pad(i)}</option>
                            ))}
                          </select>
                          <select
                            value={form.endMinute}
                            onChange={e => setForm(f => ({ ...f, endMinute: Number(e.target.value) }))}
                            className="flex-1 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 text-[12px] font-bold focus:border-indigo-500 outline-none"
                          >
                            {[0, 15, 30, 45].map(m => <option key={m} value={m}>{pad(m)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1.5">สี</label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                            style={{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: 1 }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: form.color + '18', border: `1px solid ${form.color}40` }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: form.color }} />
                      <span className="text-[11px] font-black" style={{ color: form.color }}>
                        {form.name || 'Preview'} — {fmtTime(form.startHour, form.startMinute)} → {fmtTime(form.endHour, form.endMinute)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setShowForm(false)} className="flex-1 h-9 rounded-lg border border-[var(--border)] text-[11px] font-black text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors">
                        ยกเลิก
                      </button>
                      <button onClick={handleSave} disabled={saving || !form.name.trim()}
                        className="flex-1 h-9 rounded-lg text-[11px] font-black text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                        style={{ background: form.color }}>
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* List */}
              {loading ? (
                <div className="flex justify-center py-8 opacity-30">
                  <div className="w-6 h-6 rounded-full border-2 border-t-indigo-500 border-[var(--border)] animate-spin" />
                </div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 opacity-30">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-[11px] font-black uppercase tracking-widest">ยังไม่มี Template</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shifts.map(s => (
                    <div key={s._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-inset)]">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black truncate">{s.name}</p>
                        <p className="text-[9px] opacity-50 font-bold">{fmtTime(s.startHour, s.startMinute)} → {fmtTime(s.endHour, s.endMinute)}</p>
                      </div>
                      <button onClick={() => handleEdit(s)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s._id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!showForm && (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <button onClick={handleNew}
                  className="w-full h-9 rounded-xl bg-indigo-500 text-white text-[11px] font-black flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors">
                  <Plus className="w-4 h-4" />
                  เพิ่ม Template ใหม่
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
