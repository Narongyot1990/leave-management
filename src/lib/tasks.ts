import { ShieldAlert, Car, AlertTriangle, FileText, MoreHorizontal } from 'lucide-react';

export interface TaskCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'safety', label: 'ความปลอดภัย', icon: ShieldAlert, color: '#EF4444' },
  { id: 'driving', label: 'การขับรถ', icon: Car, color: '#3B82F6' },
  { id: 'traffic', label: 'กฎจราจร', icon: AlertTriangle, color: '#F59E0B' },
  { id: 'rules', label: 'กฎระเบียบ', icon: FileText, color: '#6366F1' },
  { id: 'other', label: 'อื่นๆ', icon: MoreHorizontal, color: '#64748B' },
];

export function getTaskCategoryLabel(category: string): string {
  return TASK_CATEGORIES.find((item) => item.id === category)?.label || category;
}
