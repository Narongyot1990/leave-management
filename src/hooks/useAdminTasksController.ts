"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePusher } from "@/hooks/usePusher";

export interface TaskQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

export interface Submission {
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

export interface ActiveDriver {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  branch?: string;
}

export interface Task {
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

interface TaskResponse {
  success?: boolean;
  tasks?: Task[];
  error?: string;
}

interface UsersResponse {
  success?: boolean;
  users?: ActiveDriver[];
}

interface UseAdminTasksControllerArgs {
  userId?: string;
  enabled: boolean;
  selectedBranch: string;
  withBranchParam: (url: string) => string;
  appendBranchToParams: (params: URLSearchParams) => URLSearchParams;
}

type TaskQuestionField = "question" | "correctIndex" | "hint";

const EMPTY_QUESTION: TaskQuestion = {
  question: "",
  options: ["", ""],
  correctIndex: 0,
  hint: "",
};

export function useAdminTasksController({
  userId,
  enabled,
  selectedBranch,
  withBranchParam,
  appendBranchToParams,
}: UseAdminTasksControllerArgs) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("safety");
  const [branches, setBranches] = useState<string[]>([]);
  const [questions, setQuestions] = useState<TaskQuestion[]>([EMPTY_QUESTION]);
  const [expandedHint, setExpandedHint] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);
  const [showPending, setShowPending] = useState<string | null>(null);

  const resetCreateForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("safety");
    setBranches([]);
    setQuestions([EMPTY_QUESTION]);
    setExpandedHint(null);
    setError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetCreateForm();
    setShowCreate(true);
  }, [resetCreateForm]);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(withBranchParam("/api/tasks"));
      const data = (await response.json()) as TaskResponse;
      if (data.success) {
        setTasks(data.tasks ?? []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [withBranchParam]);

  const fetchActiveDrivers = useCallback(async () => {
    try {
      const userUrl = new URL("/api/users", window.location.origin);
      const params = appendBranchToParams(new URLSearchParams());
      params.set("status", "active");
      userUrl.search = params.toString();

      const response = await fetch(userUrl.toString());
      const data = (await response.json()) as UsersResponse;
      if (data.success) {
        setActiveDrivers(data.users ?? []);
      }
    } catch (error) {
      console.error(error);
    }
  }, [appendBranchToParams]);

  useEffect(() => {
    if (!enabled) return;
    fetchTasks();
    fetchActiveDrivers();
  }, [enabled, fetchActiveDrivers, fetchTasks, selectedBranch]);

  const handleTaskChanged = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  usePusher(
    "tasks",
    [
      { event: "new-task", callback: handleTaskChanged },
      { event: "task-updated", callback: handleTaskChanged },
      { event: "task-deleted", callback: handleTaskChanged },
      { event: "task-submitted", callback: handleTaskChanged },
    ],
    enabled,
  );

  const addQuestion = useCallback(() => {
    setQuestions((previous) => [...previous, { ...EMPTY_QUESTION }]);
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((previous) => {
      if (previous.length <= 1) return previous;
      return previous.filter((_, questionIndex) => questionIndex !== index);
    });
  }, []);

  const updateQuestion = useCallback(
    (questionIndex: number, field: TaskQuestionField, value: string | number) => {
      setQuestions((previous) =>
        previous.map((question, index) =>
          index !== questionIndex
            ? question
            : {
                ...question,
                [field]: field === "correctIndex" ? Number(value) : String(value),
              },
        ),
      );
    },
    [],
  );

  const addOption = useCallback((questionIndex: number) => {
    setQuestions((previous) =>
      previous.map((question, index) =>
        index !== questionIndex
          ? question
          : { ...question, options: [...question.options, ""] },
      ),
    );
  }, []);

  const updateOption = useCallback(
    (questionIndex: number, optionIndex: number, value: string) => {
      setQuestions((previous) =>
        previous.map((question, index) => {
          if (index !== questionIndex) return question;
          const options = question.options.map((option, currentOptionIndex) =>
            currentOptionIndex === optionIndex ? value : option,
          );
          return { ...question, options };
        }),
      );
    },
    [],
  );

  const removeOption = useCallback((questionIndex: number, optionIndex: number) => {
    setQuestions((previous) =>
      previous.map((question, index) => {
        if (index !== questionIndex || question.options.length <= 2) return question;
        const options = question.options.filter(
          (_, currentOptionIndex) => currentOptionIndex !== optionIndex,
        );
        const correctIndex =
          question.correctIndex >= options.length ? 0 : question.correctIndex;
        return { ...question, options, correctIndex };
      }),
    );
  }, []);

  const toggleCreateBranch = useCallback((branchCode: string) => {
    setBranches((previous) =>
      previous.includes(branchCode)
        ? previous.filter((item) => item !== branchCode)
        : [...previous, branchCode],
    );
  }, []);

  const toggleQuestionHint = useCallback((questionIndex: number) => {
    setExpandedHint((previous) => (previous === questionIndex ? null : questionIndex));
  }, []);

  const toggleTaskExpanded = useCallback((taskId: string) => {
    setExpandedTask((previous) => (previous === taskId ? null : taskId));
  }, []);

  const togglePendingPanel = useCallback((taskId: string) => {
    setShowPending((previous) => (previous === taskId ? null : taskId));
  }, []);

  const handleCreate = useCallback(async () => {
    setError("");

    if (!title.trim()) {
      setError("กรุณากรอกชื่อ Task");
      return;
    }

    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()) || q.correctIndex === -1)) {
      setError("กรุณากรอกคำถามและตัวเลือกให้ครบ");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          branches,
          questions,
          createdBy: userId,
        }),
      });

      const data = (await response.json()) as TaskResponse;
      if (data.success && data.tasks && data.tasks.length > 0) {
        setTasks(prev => [data.tasks![0], ...prev]);
        return true;
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
        return false;
      }
    } catch {
      setError("เกิดข้อผิดพลาด");
      return false;
    } finally {
      setCreating(false);
    }
  }, [
    branches,
    category,
    description,
    fetchTasks,
    questions,
    resetCreateForm,
    title,
    userId,
  ]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!confirm("เธ•เนเธญเธเธเธฒเธฃเธฅเธ Task เธเธตเน?")) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = (await response.json()) as TaskResponse;
      if (data.success) {
        setTasks((previous) => previous.filter((task) => task._id !== taskId));
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleCloseTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          data: { status: "closed" },
        }),
      });
      const data = (await response.json()) as TaskResponse;
      if (data.success) {
        setTasks((previous) =>
          previous.map((task) =>
            task._id === taskId ? { ...task, status: "closed" } : task,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const state = useMemo(
    () => ({
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
    }),
    [
      activeDrivers,
      branches,
      category,
      creating,
      description,
      error,
      expandedHint,
      expandedTask,
      loading,
      questions,
      showCreate,
      showPending,
      tasks,
      title,
    ],
  );

  return {
    ...state,
    setShowCreate,
    setTitle,
    setDescription,
    setCategory,
    setBranches,
    setExpandedHint,
    setExpandedTask,
    setShowPending,
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
  };
}

export default useAdminTasksController;
