'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Users, CheckCircle2, ChevronDown, ChevronUp, Phone, UserCircle } from 'lucide-react';
import AdminCardShell from '@/components/AdminCardShell';
import UserAvatar from '@/components/UserAvatar';
import type { ActiveDriver, Task } from '@/hooks/useAdminTasksController';
import { getTaskCategoryLabel } from '@/lib/tasks';

interface AdminTaskCardProps {
  task: Task;
  index: number;
  activeDrivers: ActiveDriver[];
  expandedTask: string | null;
  showPending: string | null;
  onToggleExpandedTask: (taskId: string) => void;
  onToggleShowPending: (taskId: string) => void;
  onCloseTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function AdminTaskCard({
  task,
  index,
  activeDrivers,
  expandedTask,
  showPending,
  onToggleExpandedTask,
  onToggleShowPending,
  onCloseTask,
  onDeleteTask,
}: AdminTaskCardProps) {
  const submittedIds = new Set(task.submissions.map((submission) => submission.userId?._id));
  const targetDrivers = task.branches.length > 0
    ? activeDrivers.filter((driver) => driver.branch && task.branches.includes(driver.branch))
    : activeDrivers;
  const pendingDrivers = targetDrivers.filter((driver) => !submittedIds.has(driver._id));
  const pendingCount = pendingDrivers.length;

  return (
    <AdminCardShell
      key={task._id}
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`badge ${task.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {task.status === 'active' ? 'Active' : 'Closed'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                {getTaskCategoryLabel(task.category)}
              </span>
              {task.branches.map((branchCode) => (
                <span key={branchCode} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{branchCode}</span>
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
              <button onClick={() => onCloseTask(task._id)} className="btn btn-ghost p-2 text-[10px]" style={{ color: 'var(--warning)' }}>
                ปิด
              </button>
            )}
            <button onClick={() => onDeleteTask(task._id)} className="btn btn-ghost p-2" style={{ color: 'var(--danger)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          {task.submissions.length > 0 && (
            <button
              onClick={() => onToggleExpandedTask(task._id)}
              className="flex items-center gap-1 text-fluid-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {expandedTask === task._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              ดูผลคะแนน ({task.submissions.length})
            </button>
          )}
          {task.status === 'active' && pendingCount > 0 && (
            <button
              onClick={() => onToggleShowPending(task._id)}
              className="flex items-center gap-1 text-fluid-xs font-medium"
              style={{ color: 'var(--danger)' }}
            >
              <UserCircle className="w-3.5 h-3.5" />
              ยังไม่ส่ง ({pendingCount})
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(expandedTask === task._id || showPending === task._id) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[var(--bg-inset)] border-t border-[var(--border)]"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    task.submissions.map((submission) => (
                      <div key={submission.userId?._id} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
                        <UserAvatar imageUrl={submission.userId?.lineProfileImage} displayName={submission.userId?.name || submission.userId?.lineDisplayName} tier={submission.userId?.performanceTier} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-fluid-xs font-bold text-[var(--text-primary)] truncate">
                            {submission.userId?.name && submission.userId?.surname ? `${submission.userId.name} ${submission.userId.surname}` : submission.userId?.lineDisplayName}
                          </p>
                          <p className="text-[9px] text-[var(--text-muted)]">ส่งเมื่อ {new Date(submission.submittedAt).toLocaleDateString('th-TH')}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-fluid-xs font-extrabold" style={{ color: submission.score >= submission.total * 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                              {submission.score}/{submission.total}
                            </span>
                          </div>
                          <span className="text-[9px] font-medium text-[var(--text-muted)]">
                            {Math.round((submission.score / submission.total) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--danger)] ml-1">
                  <Users className="w-3 h-3" />
                  ยังไม่ส่ง ({pendingDrivers.length})
                </h4>
                <div className="space-y-2">
                  {pendingDrivers.length === 0 ? (
                    <div className="p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-center">
                      <p className="text-[10px] text-[var(--success)]">ครบทุกคนแล้ว!</p>
                    </div>
                  ) : (
                    pendingDrivers.map((driver) => (
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminCardShell>
  );
}
