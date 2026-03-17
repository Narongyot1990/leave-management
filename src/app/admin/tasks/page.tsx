'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ClipboardCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AdminBranchFilter from '@/components/AdminBranchFilter';
import AdminModalShell from '@/components/AdminModalShell';
import AdminTaskCreateForm from '@/components/AdminTaskCreateForm';
import AdminTaskCard from '@/components/AdminTaskCard';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminBranchScope } from '@/hooks/useAdminBranchScope';
import { useBranches } from '@/hooks/useBranches';
import { useAdminTasksController } from '@/hooks/useAdminTasksController';

export default function AdminTasksPage() {
  const { user } = useAdminSession();
  const { branches: branchItems, loading: branchesLoading } = useBranches();
  const role = 'admin' as const;
  const { selectedBranch, setSelectedBranch, withBranchParam, appendBranchToParams } =
    useAdminBranchScope();
  const {
    tasks,
    loading,
    showCreate,
    title,
    description,
    category,
    branches,
    questions,
    expandedHint,
    creating,
    error,
    expandedTask,
    activeDrivers,
    showPending,
    setTitle,
    setDescription,
    setCategory,
    openCreateModal,
    closeCreateModal,
    addQuestion,
    removeQuestion,
    updateQuestion,
    addOption,
    updateOption,
    removeOption,
    toggleCreateBranch,
    toggleQuestionHint,
    toggleTaskExpanded,
    togglePendingPanel,
    handleCreate,
    handleDelete,
    handleCloseTask,
  } = useAdminTasksController({
    userId: user?.id,
    enabled: !!user,
    selectedBranch,
    withBranchParam,
    appendBranchToParams,
  });
  const availableBranchCodes = (branchesLoading ? [] : branchItems).map((branch) => branch.code);

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader 
          title="จัดการ Tasks" 
          subtitle="สร้างและติดตามแบบทดสอบสำหรับพนักงาน" 
          backHref="/admin/home"
          rightContent={
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 rounded-full text-fluid-xs font-medium flex items-center gap-1.5"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Plus className="w-3.5 h-3.5" />
              สร้าง Task
            </button>
          }
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Branch Filter for Admin */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <AdminBranchFilter
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
                branchCodes={availableBranchCodes}
              />
            </motion.div>
            {loading ? (
              <AdminLoadingState />
            ) : tasks.length === 0 ? (
              <AdminEmptyState
                icon={ClipboardCheck}
                message="ยังไม่มี Task"
                action={
                  <button onClick={openCreateModal} className="btn btn-primary text-fluid-xs">
                    สร้าง Task แรก
                  </button>
                }
              />
            ) : (
              tasks.map((task, index) => (
                <AdminTaskCard
                  key={task._id}
                  task={task}
                  index={index}
                  activeDrivers={activeDrivers}
                  expandedTask={expandedTask}
                  showPending={showPending}
                  onToggleExpandedTask={toggleTaskExpanded}
                  onToggleShowPending={togglePendingPanel}
                  onCloseTask={handleCloseTask}
                  onDeleteTask={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <AdminModalShell
            onClose={closeCreateModal}
            backdropStyle={{ background: 'rgba(0,0,0,0.6)' }}
            contentClassName="card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-3.5"
          >
            <AdminTaskCreateForm
              title={title}
              description={description}
              category={category}
              branches={branches}
              questions={questions}
              expandedHint={expandedHint}
              creating={creating}
              error={error}
              availableBranchCodes={availableBranchCodes}
              onClose={closeCreateModal}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onCategoryChange={setCategory}
              onToggleBranch={toggleCreateBranch}
              onToggleHint={toggleQuestionHint}
              onAddQuestion={addQuestion}
              onRemoveQuestion={removeQuestion}
              onUpdateQuestion={updateQuestion}
              onAddOption={addOption}
              onUpdateOption={updateOption}
              onRemoveOption={removeOption}
              onCreate={handleCreate}
            />
          </AdminModalShell>
        )}
      </AnimatePresence>

      <BottomNav role={role} />
    </div>
  );
}









