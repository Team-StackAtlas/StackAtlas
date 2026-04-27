import React from 'react';
import { AccessTag } from '../data/mockData';
import { cn } from '../lib/utils';
import { useUserScope } from '../context/UserScopeContext';

interface AccessBadgeProps {
  tag?: AccessTag;
  className?: string;
  forceShow?: boolean; // For the onboarding preview
}

export default function AccessBadge({ tag, className, forceShow }: AccessBadgeProps) {
  const { scope } = useUserScope();
  
  // If no primary region is set, force Unknown badge, unless forceShow is true
  const effectiveTag = (!forceShow && !scope.primaryRegion) ? undefined : tag;

  const getBadgeStyles = () => {
    switch (effectiveTag) {
      case 'Standard':
        return 'bg-emerald-500 text-emerald-50';
      case 'Pharma':
        return 'bg-blue-500 text-blue-50';
      case 'Frontier':
        return 'bg-purple-500 text-purple-50';
      case 'Unregulated':
        return 'bg-yellow-500 text-yellow-50';
      case 'Restricted':
        return 'bg-orange-500 text-orange-50';
      case 'Illicit':
        return 'bg-red-500 text-red-50';
      default:
        return 'bg-white border border-slate-300 text-slate-400';
    }
  };

  const getBadgeLabel = () => {
    switch (effectiveTag) {
      case 'Standard': return 'S';
      case 'Pharma': return 'P';
      case 'Frontier': return 'F';
      case 'Unregulated': return 'U';
      case 'Restricted': return '!';
      case 'Illicit': return 'X';
      default: return '?';
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm shrink-0",
        getBadgeStyles(),
        className
      )}
      title={effectiveTag || 'Unknown'}
    >
      {getBadgeLabel()}
    </div>
  );
}
