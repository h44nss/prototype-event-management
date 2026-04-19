import { getStatusLabel } from '../../lib/utils';

const statusStyles: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  assigned: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  on_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending_verification: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  waiting: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  started: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  instruction_received: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  need_revision: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  invited: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  published: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  available: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${style}`}>
      {getStatusLabel(status)}
    </span>
  );
}
