'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, ClipboardCheck, Trash2, X, Users, CheckCircle2, Award, ChevronDown, ChevronUp, Lightbulb, Phone, UserCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';

const ALL_BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];
const BRANCHES = ALL_BRANCHES;

const CATEGORIES = [
  { value: 'safety', label: 'ความปลอดภัย' },
  { value: 'driving', label: 'การขับรถ' },
  { value: 'traffic', label: 'กฎจราจร' },
  { value: 'company', label: 'กฎระเบียบ' },
  { value: 'other', label: 'อื่นๆ' },
];

interface TaskQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

interface Submission {
  userId: {
    _id: string;
    lineDisplayName: string;
    lineProfileImage?: string;
    performanceTier?: string;
    name?: string;
    surname?: string;
  };
  score: number;
  total: number;
  submittedAt: string;
}

interface ActiveDriver {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  branch?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  branches: string[];
  questions: TaskQuestion[];
  submissions: Submission[];
  status: string;
  createdAt: string;
}

export default function LeaderTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('safety');
  const [branches, setBranches] = useState<string[]>([]);
  const [questions, setQuestions] = useState<TaskQuestion[]>([{ question: '', options: ['', ''], correctIndex: 0, hint: '' }]);
  const [expandedHint, setExpandedHint] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Expanded task (to see submissions)
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Active drivers for un-submitted tracking
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);
  const [showPending, setShowPending] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          if (data.user.role === 'admin') {
            setSelectedBranch('all');
          } else {
            setSelectedBranch(data.user.branch || 'all');
          }
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = '/api/tasks';
      if (role === 'admin' && selectedBranch !== 'all') {
        url += `?branch=${selectedBranch}`;
      } else if (role === 'leader' && user?.branch) {
        url += `?branch=${user.branch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setTasks(data.tasks || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    fetchTasks();
    
    // Fetch active drivers for un-submitted tracking
    const userUrl = new URL('/api/users', window.location.origin);
    userUrl.searchParams.set('status', 'active');
    if (role === 'admin' && selectedBranch !== 'all') {
      userUrl.searchParams.set('branch', selectedBranch);
    } else if (role === 'leader' && user?.branch) {
      userUrl.searchParams.set('branch', user.branch);
    }
    
    fetch(userUrl.toString())
      .then(r => r.json())
      .then(data => { if (data.success) setActiveDrivers(data.users || []); })
      .catch(() => {});
  }, [user, role, selectedBranch]);

  // Pusher realtime — task changes
  const handleTaskChanged = useCallback(() => {
    fetchTasks();
  }, []);

  usePusher('tasks', [
    { event: 'new-task', callback: handleTaskChanged },
    { event: 'task-updated', callback: handleTaskChanged },
    { event: 'task-deleted', callback: handleTaskChanged },
    { event: 'task-submitted', callback: handleTaskChanged },
  ], !!user);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', ''], correctIndex: 0, hint: '' }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push('');
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    if (questions[qIdx].options.length <= 2) return;
    const updated = [...questions];
    updated[qIdx].options.splice(oIdx, 1);
    if (updated[qIdx].correctIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctIndex = 0;
    }
    setQuestions(updated);
  };

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) { setError('กรุณากรอกชื่อ Task'); return; }
    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      setError('กรุณากรอกคำถามและตัวเลือกให้ครบ'); return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, branches, questions, createdBy: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setTitle(''); setDescription(''); setCategory('safety'); setBranches([]); setQuestions([{ question: '', options: ['', ''], correctIndex: 0, hint: '' }]);
        fetchTasks();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch { setError('เกิดข้อผิดพลาด'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('ต้องการลบ Task นี้?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) { console.error(err); }
  };

  const handleCloseTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json();
      if (data.success) setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'closed' } : t));
    } catch (err) { console.error(err); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader
          title="จัดการ Tasks"
          backHref="/leader/home"
          rightContent={
            <button onClick={() => { setBranches([]); setShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-fluid-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
              <Plus className="w-3.5 h-3.5" />
              สร้าง Task
            </button>
          }
        />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Branch Filter for Admin */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {ALL_BRANCHES.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </motion.div>
            )}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : tasks.length === 0 ? (
              <div className="card p-12 text-center">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ยังไม่มี Task</p>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary mt-4 text-fluid-xs">สร้าง Task แรก</button>
              </div>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task._id}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.04 }}
                  className="card overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`badge ${task.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {task.status === 'active' ? 'Active' : 'Closed'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                            {CATEGORIES.find(c => c.value === task.category)?.label || task.category}
                          </span>
                          {task.branches.map(b => (
                            <span key={b} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{b}</span>
                          ))}
                        </div>
                        <h3 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
                        {task.description && <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{task.questions.length} ข้อ</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.submissions.length} ส่งแล้ว
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.status === 'active' && (
                          <button onClick={() => handleCloseTask(task._id)} className="btn btn-ghost p-2 text-[10px]" style={{ color: 'var(--warning)' }}>
                            ปิด
                          </button>
                        )}
                        <button onClick={() => handleDelete(task._id)} className="btn btn-ghost p-2" style={{ color: 'var(--danger)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Submissions toggle + Un-submitted toggle */}
                    <div className="flex items-center gap-3 mt-3">
                      {task.submissions.length > 0 && (
                        <button
                          onClick={() => setExpandedTask(expandedTask === task._id ? null : task._id)}
                          className="flex items-center gap-1 text-fluid-xs font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          {expandedTask === task._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          ดูผลคะแนน ({task.submissions.length})
                        </button>
                      )}
                      {task.status === 'active' && (() => {
                        const submittedIds = new Set(task.submissions.map(s => s.userId?._id));
                        const targetDrivers = task.branches.length > 0
                          ? activeDrivers.filter(d => d.branch && task.branches.includes(d.branch))
                          : activeDrivers;
                        const pendingCount = targetDrivers.filter(d => !submittedIds.has(d._id)).length;
                        if (pendingCount === 0) return null;
                        return (
                          <button
                            onClick={() => setShowPending(showPending === task._id ? null : task._id)}
                            className="flex items-center gap-1 text-fluid-xs font-medium"
                            style={{ color: 'var(--danger)' }}
                          >
                            <UserCircle className="w-3.5 h-3.5" />
                            ยังไม่ส่ง ({pendingCount})
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Submissions & Pending Split View */}
                  <AnimatePresence>
                    {(expandedTask === task._id || showPending === task._id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-[var(--bg-inset)] border-t border-[var(--border)]"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Done Section */}
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--success)] ml-1">
                              <CheckCircle2 className="w-3 h-3" />
                              ติตตามการส่งงาน ({task.submissions.length})
                            </h4>
                            <div className="space-y-2">
                              {task.submissions.length === 0 ? (
                                <div className="p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-center">
                                  <p className="text-[10px] text-[var(--text-muted)]">ยังไม่มีผู้ส่งงาน</p>
                                </div>
                              ) : (
                                task.submissions.map((sub) => (
                                  <div key={sub.userId?._id} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
                                    <UserAvatar imageUrl={sub.userId?.lineProfileImage} displayName={sub.userId?.name || sub.userId?.lineDisplayName} tier={sub.userId?.performanceTier} size="xs" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-fluid-xs font-bold text-[var(--text-primary)] truncate">
                                        {sub.userId?.name && sub.userId?.surname ? `${sub.userId.name} ${sub.userId.surname}` : sub.userId?.lineDisplayName}
                                      </p>
                                      <p className="text-[9px] text-[var(--text-muted)]">ส่งเมื่อ {new Date(sub.submittedAt).toLocaleDateString('th-TH')}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className="flex items-center gap-1">
                                        <span className="text-fluid-xs font-extrabold" style={{ color: sub.score >= sub.total * 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                                          {sub.score}/{sub.total}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-medium text-[var(--text-muted)]">
                                        {Math.round((sub.score / sub.total) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Pending Section */}
                          <div className="space-y-3">
                            {(() => {
                              const submittedIds = new Set(task.submissions.map(s => s.userId?._id));
                              const targetDrivers = task.branches.length > 0
                                ? activeDrivers.filter(d => d.branch && task.branches.includes(d.branch))
                                : activeDrivers;
                              const pending = targetDrivers.filter(d => !submittedIds.has(d._id));
                              
                              return (
                                <>
                                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--danger)] ml-1">
                                    <Users className="w-3 h-3" />
                                    ยังไม่ส่ง ({pending.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {pending.length === 0 ? (
                                      <div className="p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-center">
                                        <p className="text-[10px] text-[var(--success)]">ครบทุกคนแล้ว!</p>
                                      </div>
                                    ) : (
                                      pending.map((driver) => (
                                        <div key={driver._id} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm group">
                                          <UserAvatar imageUrl={driver.lineProfileImage} displayName={driver.name || driver.lineDisplayName} tier={driver.performanceTier} size="xs" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-fluid-xs font-bold text-[var(--text-primary)] truncate">
                                              {driver.name && driver.surname ? `${driver.name} ${driver.surname}` : driver.lineDisplayName}
                                            </p>
                                            <span className="text-[9px] text-[var(--text-muted)]">{driver.branch}</span>
                                          </div>
                                          {driver.phone && (
                                            <motion.a
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              href={`tel:${driver.phone}`}
                                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-[var(--success-light)]"
                                              style={{ background: 'var(--success-light)' }}
                                            >
                                              <Phone className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                                            </motion.a>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>สร้าง Task ใหม่</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm mb-4" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>ชื่อ Task</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="เช่น แบบทดสอบด้านความปลอดภัย" />
                </div>
                <div>
                  <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>คำอธิบาย</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" rows={2} placeholder="รายละเอียด (ไม่บังคับ)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>หมวดหมู่</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>สาขา</label>
                    <div className="flex flex-wrap gap-1.5">
                      {BRANCHES.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                          className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                          style={{
                            background: branches.includes(b) ? 'var(--accent)' : 'var(--bg-inset)',
                            color: branches.includes(b) ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>คำถาม</label>
                  <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-fluid-xs font-bold" style={{ color: 'var(--text-primary)' }}>ข้อ {qIdx + 1}</span>
                          {questions.length > 1 && (
                            <button onClick={() => removeQuestion(qIdx)} className="text-[10px]" style={{ color: 'var(--danger)' }}>ลบ</button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                          className="input mb-2"
                          placeholder="คำถาม..."
                        />
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                  borderColor: q.correctIndex === oIdx ? 'var(--success)' : 'var(--border)',
                                  background: q.correctIndex === oIdx ? 'var(--success)' : 'transparent',
                                }}
                              >
                                {q.correctIndex === oIdx && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                className="input flex-1 py-1.5 text-fluid-xs"
                                placeholder={`ตัวเลือก ${String.fromCharCode(65 + oIdx)}`}
                              />
                              {q.options.length > 2 && (
                                <button onClick={() => removeOption(qIdx, oIdx)} style={{ color: 'var(--danger)' }}>
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addOption(qIdx)} className="text-[10px] font-medium mt-1.5" style={{ color: 'var(--accent)' }}>
                          + เพิ่มตัวเลือก
                        </button>

                        {/* Collapsible hint section */}
                        <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedHint(expandedHint === qIdx ? null : qIdx)}
                            className="flex items-center gap-1 text-[10px] font-medium"
                            style={{ color: 'var(--warning)' }}
                          >
                            <Lightbulb className="w-3 h-3" />
                            {expandedHint === qIdx ? 'ซ่อนคำแนะนำ' : 'เพิ่มคำแนะนำ (ไม่บังคับ)'}
                            {expandedHint === qIdx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {expandedHint === qIdx && (
                            <textarea
                              value={q.hint || ''}
                              onChange={(e) => updateQuestion(qIdx, 'hint', e.target.value)}
                              className="input mt-1.5 resize-none text-fluid-xs"
                              rows={2}
                              placeholder="คำแนะนำ/ความรู้เพิ่มเติมสำหรับข้อนี้... เช่น กฎหมายกำหนดให้สวมหมวกนิรภัยทุกครั้งก่อนออกรถ"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addQuestion} className="btn btn-secondary w-full mt-2 text-fluid-xs">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มคำถาม
                  </button>
                </div>

                <button onClick={handleCreate} disabled={creating} className="btn btn-primary w-full">
                  {creating ? 'กำลังสร้าง...' : 'สร้าง Task'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="leader" />
    </div>
  );
}
