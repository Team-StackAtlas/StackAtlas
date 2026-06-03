import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import { cn } from '../lib/utils';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { logs } = useLogs();

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Helper to check if a log applies to a specific date
  const logAppliesToDate = (log: any, date: Date) => {
    const logStart = new Date(log.startDate);
    logStart.setHours(0, 0, 0, 0);
    const logEnd = log.endDate ? new Date(log.endDate) : new Date(2100, 0, 1); // Far future if ongoing
    logEnd.setHours(23, 59, 59, 999);
    
    const checkDate = new Date(date);
    checkDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases

    if (checkDate < logStart || checkDate > logEnd) return false;

    if (log.frequency === 'everyday') return true;
    if (log.frequency === 'most_days') {
      // Simple mock: skip weekends for 'most days'
      const day = checkDate.getDay();
      return day !== 0 && day !== 6;
    }
    if (log.frequency === 'some_days') {
      // Simple mock: only Mon/Wed/Fri
      const day = checkDate.getDay();
      return day === 1 || day === 3 || day === 5;
    }
    if (log.frequency === 'custom' && log.customSchedule) {
      const schedule = log.customSchedule;
      const dayDiff = Math.floor((checkDate.getTime() - logStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (schedule.type === 'days_of_week') {
        if (!schedule.daysOfWeek?.includes(checkDate.getDay())) return false;
        
        const logStartWeekStart = new Date(logStart);
        logStartWeekStart.setDate(logStart.getDate() - logStart.getDay());
        const checkDateWeekStart = new Date(checkDate);
        checkDateWeekStart.setDate(checkDate.getDate() - checkDate.getDay());
        
        const weekDiff = Math.round((checkDateWeekStart.getTime() - logStartWeekStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (weekDiff % (schedule.intervalWeeks || 1) !== 0) return false;
        
        return true;
      }
      
      if (schedule.type === 'interval') {
        return dayDiff % (schedule.intervalDays || 1) === 0;
      }
      
      if (schedule.type === 'cycle') {
        const cycleLength = (schedule.cycleOnDays || 1) + (schedule.cycleOffDays || 1);
        const cycleDay = dayDiff % cycleLength;
        return cycleDay < (schedule.cycleOnDays || 1);
      }
    }
    return false;
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 sm:h-24 border border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/20"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const isToday = new Date().toDateString() === date.toDateString();
      
      const dayLogs = logs.filter(log => logAppliesToDate(log, date));

      days.push(
        <div key={i} className={cn(
          "h-16 sm:h-24 border border-slate-200 dark:border-zinc-800 p-1 sm:p-2 flex flex-col overflow-hidden transition-colors",
          isToday ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
        )}>
          <span className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
            isToday ? "bg-emerald-500 text-white" : "text-slate-700 dark:text-zinc-300"
          )}>
            {i}
          </span>
          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1">
            {dayLogs.map((log, idx) => (
              <div key={idx} className="text-[8px] sm:text-[10px] leading-tight px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 truncate">
                {log.time} - {log.substance}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={20} className="text-slate-700 dark:text-zinc-300" />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <ChevronRight size={20} className="text-slate-700 dark:text-zinc-300" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {renderDays()}
        </div>
      </div>
    </div>
  );
}
