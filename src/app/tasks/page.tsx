'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, CheckCircle2, Clock, ChevronRight, Award, AlertCircle, X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';

interface TaskQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  questions: TaskQuestion[];
  deadline?: string;
  status: string;
  completed: boolean;
  mySubmission?: {
    score: number;
    total: number;
    answers: number[];
    submittedAt: string;
  };
  createdAt: string;
}

const categoryColors: Record<string, { bg: string; color: string; label: string }> = {
  safety: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ความปลอดภัย' },
  driving: { bg: 'var(--accent-light)', color: 'var(--accent)', label: 'การขับรถ' },
  traffic: { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'กฎจราจร' },
  company: { bg: 'var(--success-light)', color: 'var(--success)', label: 'กฎระเบียบ' },
  other: { bg: 'var(--bg-inset)', color: 'var(--text-muted)', label: 'อื่นๆ' },
};

function getCategoryMeta(cat: string) {
  return categoryColors[cat] || categoryColors.other;
}

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; branch?: string } | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Quiz modal
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) { router.push('/login'); return; }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (user.branch) params.set('branch', user.branch);
        params.set('userId', user.id);
        const res = await fetch(`/api/tasks?${params.toString()}`);
        const data = await res.json();
        if (data.success) setTasks(data.tasks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  const { showToast } = useToast();

  // Pusher realtime — task changes (use ref to avoid stale closure)
  const refetchTasks = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    try {
      const params = new URLSearchParams();
      if (u.branch) params.set('branch', u.branch);
      params.set('userId', u.id);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (data.success) setTasks(data.tasks || []);
    } catch { /* ignore */ }
  }, []);

  const handleNewTask = useCallback(async (data: { title?: string }) => {
    await refetchTasks();
    showToast('notification', `มีแบบทดสอบใหม่: ${data?.title || 'แบบทดสอบ'}`);
  }, [refetchTasks, showToast]);

  usePusher('tasks', [
    { event: 'new-task', callback: handleNewTask },
    { event: 'task-updated', callback: refetchTasks },
    { event: 'task-deleted', callback: refetchTasks },
    { event: 'task-submitted', callback: refetchTasks },
  ], !!user, 0);  // debounce=0 for immediate task updates

  const pendingTasks = tasks.filter(t => !t.completed && t.status === 'active');
  const completedTasks = tasks.filter(t => t.completed);
  const displayTasks = showCompleted ? completedTasks : pendingTasks;

  const openQuiz = (task: Task) => {
    setActiveTask(task);
    setAnswers(new Array(task.questions.length).fill(-1));
    setCurrentQ(0);
    setResult(null);
  };

  const handleAnswer = (optIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!user || !activeTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', userId: user.id, answers }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ score: data.score, total: data.total });
        setTasks(prev => prev.map(t => t._id === activeTask._id ? { ...t, completed: true, mySubmission: { score: data.score, total: data.total, answers, submittedAt: new Date().toISOString() } } : t));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="Tasks" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Filter tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleted(false)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-semibold transition-colors"
                style={{
                  background: !showCompleted ? 'var(--accent)' : 'var(--bg-surface)',
                  color: !showCompleted ? '#fff' : 'var(--text-secondary)',
                  border: !showCompleted ? 'none' : '1px solid var(--border)',
                }}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                รอทำ ({pendingTasks.length})
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-semibold transition-colors"
                style={{
                  background: showCompleted ? 'var(--success)' : 'var(--bg-surface)',
                  color: showCompleted ? '#fff' : 'var(--text-secondary)',
                  border: showCompleted ? 'none' : '1px solid var(--border)',
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                สำเร็จแล้ว ({completedTasks.length})
              </button>
            </div>

            {/* Task Bento Grid */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : displayTasks.length === 0 ? (
              <div className="card p-12 text-center">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {showCompleted ? 'ยังไม่มีงานที่สำเร็จ' : 'ไม่มีงานที่ต้องทำ'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayTasks.map((task, index) => {
                  const catMeta = getCategoryMeta(task.category);
                  const isMain = index === 0 && !showCompleted; // Make first pending task larger
                  
                  return (
                    <motion.div
                      key={task._id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => task.completed ? null : openQuiz(task)}
                      className={`relative overflow-hidden cursor-pointer group rounded-[var(--radius-xl)] ${isMain ? 'sm:col-span-2' : ''}`}
                      style={{ 
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        minHeight: isMain ? '180px' : '140px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Background Glow */}
                      <div 
                        className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[60px] opacity-10 transition-opacity group-hover:opacity-20"
                        style={{ background: catMeta.color }}
                      />

                      <div className="relative p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div 
                              className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
                              style={{ background: task.completed ? 'var(--success-light)' : catMeta.bg }}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                              ) : (
                                <ClipboardCheck className="w-5 h-5" style={{ color: catMeta.color }} />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
                              >
                                {catMeta.label}
                              </span>
                              {!task.completed && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--accent)' }}>
                                  <Clock className="w-2.5 h-2.5" strokeWidth={3} />
                                  NEW
                                </div>
                              )}
                            </div>
                          </div>

                          <h3 className={`font-bold mb-1 group-hover:text-[var(--accent)] transition-colors ${isMain ? 'text-fluid-base' : 'text-fluid-sm'}`} style={{ color: 'var(--text-primary)' }}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-fluid-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {task.questions.length} ข้อ · 
                            {task.completed ? ' สำเร็จแล้ว' : ' รอทำ'}
                          </span>
                          
                          {task.completed && task.mySubmission ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-fluid-xs font-bold" style={{ color: 'var(--success)' }}>
                                {task.mySubmission.score}/{task.mySubmission.total}
                              </span>
                              <div className="w-1 h-3 rounded-full" style={{ background: 'var(--border)' }} />
                              <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                {Math.round((task.mySubmission.score / task.mySubmission.total) * 100)}%
                              </span>
                            </div>
                          ) : (
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--accent)' }} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { if (!submitting) { setActiveTask(null); setResult(null); } }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="card w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>{activeTask.title}</h3>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                    ข้อ {currentQ + 1} / {activeTask.questions.length}
                  </p>
                </div>
                <button onClick={() => { setActiveTask(null); setResult(null); }} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1" style={{ background: 'var(--bg-inset)' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${((currentQ + 1) / activeTask.questions.length) * 100}%`, background: 'var(--accent)' }}
                />
              </div>

              {result ? (
                /* Result screen */
                <div className="p-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: result.score >= result.total * 0.7 ? 'var(--success-light)' : 'var(--warning-light)' }}>
                      <Award className="w-10 h-10" style={{ color: result.score >= result.total * 0.7 ? 'var(--success)' : 'var(--warning)' }} />
                    </div>
                  </motion.div>
                  <h3 className="text-fluid-xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {result.score}/{result.total}
                  </h3>
                  <p className="text-fluid-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                    คะแนนของคุณ ({Math.round((result.score / result.total) * 100)}%)
                  </p>
                  <p className="text-fluid-xs mb-6" style={{ color: result.score >= result.total * 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                    {result.score >= result.total * 0.7 ? 'ยอดเยี่ยม! ผ่านเกณฑ์' : 'ลองอีกครั้งนะ!'}
                  </p>
                  <button onClick={() => { setActiveTask(null); setResult(null); }} className="btn btn-primary w-full">
                    กลับ
                  </button>
                </div>
              ) : (
                /* Question */
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQ}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-fluid-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        {activeTask.questions[currentQ].question}
                      </p>

                      {/* Hint - shown after user selects an answer */}
                      {activeTask.questions[currentQ].hint && answers[currentQ] !== -1 && (
                        <div
                          className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] mb-3"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                        >
                          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                          <p className="text-fluid-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {activeTask.questions[currentQ].hint}
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {activeTask.questions[currentQ].options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            className="w-full text-left p-3.5 rounded-[var(--radius-md)] text-fluid-sm transition-all"
                            style={{
                              background: answers[currentQ] === i ? 'var(--accent-light)' : 'var(--bg-inset)',
                              border: answers[currentQ] === i ? '2px solid var(--accent)' : '2px solid transparent',
                              color: answers[currentQ] === i ? 'var(--accent)' : 'var(--text-primary)',
                              fontWeight: answers[currentQ] === i ? 600 : 400,
                            }}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: answers[currentQ] === i ? 'var(--accent)' : 'var(--border)', color: answers[currentQ] === i ? '#fff' : 'var(--text-muted)' }}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex gap-2 mt-5">
                    {currentQ > 0 && (
                      <button onClick={() => setCurrentQ(q => q - 1)} className="btn btn-secondary flex-1 text-fluid-sm">
                        ก่อนหน้า
                      </button>
                    )}
                    {currentQ < activeTask.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQ(q => q + 1)}
                        disabled={answers[currentQ] === -1}
                        className="btn btn-primary flex-1 text-fluid-sm"
                      >
                        ถัดไป
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={answers.some(a => a === -1) || submitting}
                        className="btn btn-primary flex-1 text-fluid-sm"
                      >
                        {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="driver" />
    </div>
  );
}
