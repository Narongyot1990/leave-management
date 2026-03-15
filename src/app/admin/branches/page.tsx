'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Edit2, X, Save, Search, Navigation, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { useBranches, Branch } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';

// Dynamically import map to avoid SSR issues
const BranchMap = dynamic(() => import('@/components/BranchMap'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-inset animate-pulse rounded-2xl flex items-center justify-center">Loading Map...</div>
});

interface BranchForm {
  code: string;
  name: string;
  description: string;
  lat: string;
  lon: string;
  radius: number;
  active: boolean;
}

export default function AdminBranchesPage() {
  const { branches, loading, refetch: refetchBranches } = useBranches();
  const { showToast } = useToast();
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [form, setForm] = useState<BranchForm>({
    code: '',
    name: '',
    description: '',
    lat: '12.709902',
    lon: '101.307697',
    radius: 50,
    active: true
  });

  const [saving, setSaving] = useState(false);

  const startEdit = (branch: Branch) => {
    setEditingBranch(branch.code);
    setForm({
      code: branch.code,
      name: branch.name,
      description: branch.description || '',
      lat: branch.location?.lat?.toString() || '13.7563',
      lon: branch.location?.lon?.toString() || '100.5018',
      radius: branch.radius || 50,
      active: branch.active
    });
    setIsAdding(false);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startAdd = () => {
    setForm({
      code: '',
      name: '',
      description: '',
      lat: '12.709902',
      lon: '101.307697',
      radius: 50,
      active: true
    });
    setIsAdding(true);
    setEditingBranch(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingBranch(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      showToast('error', 'กรุณาระบุรหัสและชื่อสาขา');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description,
        active: form.active,
        radius: form.radius,
        location: form.lat && form.lon ? {
          lat: parseFloat(form.lat),
          lon: parseFloat(form.lon)
        } : null
      };

      const method = isAdding ? 'POST' : 'PATCH';
      const res = await fetch('/api/branches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', isAdding ? 'เพิ่มสาขาสำเร็จ' : 'อัปเดตข้อมูลสำเร็จ');
        setEditingBranch(null);
        setIsAdding(false);
        refetchBranches();
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสาขา ${code}?`)) return;

    try {
      const res = await fetch(`/api/branches?code=${code}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ลบสาขาสำเร็จ');
        refetchBranches();
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      <div className="lg:pl-[240px] pb-6">
        <PageHeader title="จัดการสาขา" subtitle="กำหนดพิกัด แผนที่ และรัศมีของแต่ละสาขา" backHref="/admin/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text" 
                  placeholder="ค้นหาสาขา..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full pl-10 h-10 text-sm"
                />
              </div>
              <button 
                onClick={startAdd}
                className="btn btn-primary h-10 px-6 flex items-center gap-2 font-bold whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> เพิ่มสาขาใหม่
              </button>
            </div>

            {/* Add/Edit Form Overlay */}
            <AnimatePresence>
              {(isAdding || editingBranch) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="card p-4 border-t-4 border-accent shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={cancelEdit} className="p-2 hover:bg-surface rounded-full transition-colors text-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-fluid-sm font-black mb-3 flex items-center gap-2">
                    {isAdding ? <Plus className="text-accent" /> : <Edit2 className="text-accent" />}
                    {isAdding ? 'เพิ่มสาขาใหม่' : `แก้ไขสาขา ${form.code}`}
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Map Section */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2 text-accent">
                            <Navigation className="w-4 h-4" />
                            <span className="text-fluid-xs font-black uppercase tracking-widest">Interactive Map</span>
                         </div>
                         <div className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full">
                            รัศมีที่กำหนด: {form.radius}ม.
                         </div>
                      </div>
                      
                      <BranchMap 
                        center={{ lat: parseFloat(form.lat), lon: parseFloat(form.lon) }}
                        radius={form.radius}
                        onLocationChange={(lat, lon) => setForm({ ...form, lat: lat.toString(), lon: lon.toString() })}
                      />

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-muted mb-1 block">LATITUDE</label>
                            <input 
                              type="number"
                              value={form.lat}
                              onChange={e => setForm({...form, lat: e.target.value})}
                              placeholder="12.709902"
                              className="input w-full bg-inset"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted mb-1 block">LONGITUDE</label>
                            <input 
                              type="number"
                              value={form.lon}
                              onChange={e => setForm({...form, lon: e.target.value})}
                              placeholder="101.307697"
                              className="input w-full bg-inset"
                            />
                          </div>
                      </div>
                    </div>

                    {/* Data Section */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="space-y-4">
                        <div>
                          <label className="text-fluid-xs font-bold text-muted mb-1 block uppercase tracking-wider">รหัสสาขา</label>
                          <input 
                            disabled={!isAdding}
                            value={form.code}
                            onChange={e => setForm({...form, code: e.target.value})}
                            placeholder="เช่น AYA"
                            className="input w-full bg-inset font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-fluid-xs font-bold text-muted mb-1 block uppercase tracking-wider">ชื่อสาขา</label>
                          <input 
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            placeholder="ชื่อเต็ม"
                            className="input w-full bg-inset"
                          />
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                           <div className="flex items-center gap-2 mb-3 text-accent">
                              <Target className="w-4 h-4" />
                              <label className="text-fluid-xs font-black uppercase tracking-wider">Geofencing Radius</label>
                           </div>
                           <div className="flex items-center gap-4">
                              <input 
                                type="number"
                                min="10"
                                max="1000"
                                value={form.radius}
                                onChange={e => setForm({...form, radius: parseInt(e.target.value) || 50})}
                                className="input w-24 bg-white dark:bg-black/20 text-center font-black"
                              />
                              <span className="text-sm font-bold text-muted">เมตร (m)</span>
                           </div>
                           <p className="text-[10px] text-muted mt-3 italic leading-relaxed">
                              * รัศมีที่ใช้ตรวจสอบว่าพนักงานอยู่ในพื้นที่หรือไม่ 
                              (แนะนำ: 50 - 100 เมตร)
                           </p>
                        </div>

                        <div>
                          <label className="text-fluid-xs font-bold text-muted mb-1 block uppercase tracking-wider">รายละเอียด</label>
                          <textarea 
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                            placeholder="รายละเอียด..."
                            className="input w-full bg-inset min-h-[60px]"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-fluid-xs font-bold text-muted uppercase tracking-wider">สถานะ:</label>
                          <button 
                            onClick={() => setForm({...form, active: !form.active})}
                            className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${form.active ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
                          >
                            {form.active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3 justify-end">
                        <button onClick={cancelEdit} className="btn bg-surface hover:bg-surface-hover px-6 text-sm font-bold">ยกเลิก</button>
                        <button 
                          onClick={handleSave} 
                          disabled={saving}
                          className="btn btn-primary px-8 flex items-center gap-2 text-sm font-black shadow-lg shadow-accent/20"
                        >
                          {saving ? 'กำลังบันทึก...' : <><Save className="w-4 h-4" /> บันทึก</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full py-12 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="col-span-full card p-12 text-center opacity-40">
                  <MapPin className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-bold">ไม่พบข้อมูลสาขา</p>
                </div>
              ) : (
                filteredBranches.map(branch => (
                  <motion.div 
                    layout
                    key={branch.code}
                    className={`card group overflow-hidden ${!branch.active ? 'opacity-60 grayscale' : ''} border border-border/50 hover:border-accent/40 transition-colors`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`px-3 py-1.5 rounded-xl font-black text-sm ${branch.active ? 'bg-accent text-white shadow-lg shadow-accent/10' : 'bg-surface text-muted'}`}>
                          {branch.code}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => startEdit(branch)} className="p-2 hover:bg-accent/10 rounded-lg text-accent transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(branch.code)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>{branch.name}</h4>
                      <p className="text-fluid-xs text-muted mb-4 line-clamp-1">{branch.description || 'ไม่มีรายละเอียด'}</p>

                      <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                               <MapPin className="w-3 h-3 text-accent" />
                               <span className="text-[10px] font-bold text-muted">
                                 {branch.location ? `${branch.location.lat.toFixed(4)}, ${branch.location.lon.toFixed(4)}` : 'ยังไม่ระบุ'}
                               </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <Target className="w-3 h-3 text-accent" />
                               <span className="text-[10px] font-black text-accent">{branch.radius || 50}ม.</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
