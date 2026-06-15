import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from './ReportModal';
import type { ReportTargetType } from '../services/types';

interface ReportActionProps {
  targetType: ReportTargetType;
  targetId: string;
  entityName: string;
  className?: string;
}

export function ReportAction({ targetType, targetId, entityName, className }: ReportActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className ?? 'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-300'}>
        <Flag size={14} /> Report
      </button>
      <ReportModal isOpen={isOpen} onClose={() => setIsOpen(false)} entityName={entityName} targetType={targetType} targetId={targetId} />
    </>
  );
}
