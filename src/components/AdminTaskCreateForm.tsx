'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Plus, X } from 'lucide-react';
import type { TaskQuestion } from '@/hooks/useAdminTasksController';
import { TASK_CATEGORIES } from '@/lib/tasks';

interface AdminTaskCreateFormProps {
  title: string;
  description: string;
  category: string;
  branches: string[];
  questions: TaskQuestion[];
  expandedHint: number | null;
  creating: boolean;
  error: string;
  availableBranchCodes: string[];
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onToggleBranch: (branchCode: string) => void;
  onToggleHint: (questionIndex: number) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onUpdateQuestion: (
    questionIndex: number,
    field: 'question' | 'correctIndex' | 'hint',
    value: string | number,
  ) => void;
  onAddOption: (questionIndex: number) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onRemoveOption: (questionIndex: number, optionIndex: number) => void;
  onCreate: () => void;
}

export default function AdminTaskCreateForm({
  title,
  description,
  category,
  branches,
  questions,
  expandedHint,
  creating,
  error,
  availableBranchCodes,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onToggleBranch,
  onToggleHint,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onCreate,
}: AdminTaskCreateFormProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="contents"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>สร้าง Task ใหม่</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
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
          <input type="text" value={title} onChange={(event) => onTitleChange(event.target.value)} className="input" placeholder="เช่น แบบทดสอบด้านความปลอดภัย" />
        </div>
        <div>
          <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>คำอธิบาย</label>
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} className="input resize-none" rows={2} placeholder="รายละเอียด (ไม่บังคับ)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>หมวดหมู่</label>
            <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="input">
              {TASK_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-fluid-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>สาขา</label>
            <div className="flex flex-wrap gap-1.5">
              {availableBranchCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onToggleBranch(code)}
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{
                    background: branches.includes(code) ? 'var(--accent)' : 'var(--bg-inset)',
                    color: branches.includes(code) ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>คำถาม</label>
          <div className="space-y-4">
            {questions.map((question, questionIndex) => (
              <div key={questionIndex} className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-fluid-xs font-bold" style={{ color: 'var(--text-primary)' }}>ข้อ {questionIndex + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => onRemoveQuestion(questionIndex)} className="text-[10px]" style={{ color: 'var(--danger)' }}>ลบ</button>
                  )}
                </div>
                <input
                  type="text"
                  value={question.question}
                  onChange={(event) => onUpdateQuestion(questionIndex, 'question', event.target.value)}
                  className="input mb-2"
                  placeholder="คำถาม..."
                />
                <div className="space-y-1.5">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQuestion(questionIndex, 'correctIndex', optionIndex)}
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: question.correctIndex === optionIndex ? 'var(--success)' : 'var(--border)',
                          background: question.correctIndex === optionIndex ? 'var(--success)' : 'transparent',
                        }}
                      >
                        {question.correctIndex === optionIndex && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <input
                        type="text"
                        value={option}
                        onChange={(event) => onUpdateOption(questionIndex, optionIndex, event.target.value)}
                        className="input flex-1 py-1.5 text-fluid-xs"
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      {question.options.length > 2 && (
                        <button onClick={() => onRemoveOption(questionIndex, optionIndex)} style={{ color: 'var(--danger)' }}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => onAddOption(questionIndex)} className="text-[10px] font-medium mt-1.5" style={{ color: 'var(--accent)' }}>
                  + เพิ่มตัวเลือก
                </button>

                <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => onToggleHint(questionIndex)}
                    className="flex items-center gap-1 text-[10px] font-medium"
                    style={{ color: 'var(--warning)' }}
                  >
                    <Lightbulb className="w-3 h-3" />
                    {expandedHint === questionIndex ? 'ซ่อนคำแนะนำ' : 'เพิ่มคำแนะนำ (ไม่บังคับ)'}
                    {expandedHint === questionIndex ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedHint === questionIndex && (
                    <textarea
                      value={question.hint || ''}
                      onChange={(event) => onUpdateQuestion(questionIndex, 'hint', event.target.value)}
                      className="input mt-1.5 resize-none text-fluid-xs"
                      rows={2}
                      placeholder="คำแนะนำ/ความรู้เพิ่มเติมสำหรับข้อนี้... เช่น กฎหมายกำหนดให้สวมหมวกนิรภัยทุกครั้งก่อนออกรถ"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={onAddQuestion} className="btn btn-secondary w-full mt-2 text-fluid-xs">
            <Plus className="w-3.5 h-3.5" /> เพิ่มคำถาม
          </button>
        </div>

        <button onClick={onCreate} disabled={creating} className="btn btn-primary w-full">
          {creating ? 'กำลังสร้าง...' : 'สร้าง Task'}
        </button>
      </div>
    </motion.div>
  );
}
