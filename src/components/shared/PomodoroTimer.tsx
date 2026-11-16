import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Flame, Bell, Coffee, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PomodoroTimerProps {
  subjectName?: string;
  onSessionComplete?: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  subjectName = 'Revision Session',
  onSessionComplete,
}) => {
  const [mode, setMode] = useState<'study' | 'break'>('study');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const { success, info } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      if (mode === 'study') {
        success(`Focus block completed for ${subjectName}! Take a 5-minute breather.`);
        setCompletedSessions((prev) => prev + 1);
        if (onSessionComplete) onSessionComplete();
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        info('Break concluded! Ready for the next high-yield study block?');
        setMode('study');
        setTimeLeft(25 * 60);
      }
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, subjectName, onSessionComplete, success, info]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'study' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'study' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'study' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = mode === 'study' ? 25 * 60 : 5 * 60;
  const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

  return (
    <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full bg-rose-500 ${isRunning ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-bold text-[hsl(var(--foreground))] font-display">
            Pomodoro Focus Sprint
          </span>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[hsl(var(--secondary))] text-[10px] font-semibold">
          <button
            onClick={() => switchMode('study')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              mode === 'study'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              mode === 'break'
                ? 'bg-teal-500 text-white shadow-xs'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            5m Rest
          </button>
        </div>
      </div>

      {/* Main Clock Display */}
      <div className="flex items-center justify-between gap-4 py-1">
        <div>
          <div className="text-3xl font-extrabold text-[hsl(var(--foreground))] font-mono tracking-tight">
            {formattedTime}
          </div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate max-w-[180px]">
            {mode === 'study' ? `Studying: ${subjectName}` : 'Resting & brain refresh'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTimer}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs transition-colors cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600'
                : mode === 'study'
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-teal-500 hover:bg-teal-600'
            }`}
            title={isRunning ? 'Pause timer' : 'Start sprint'}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={resetTimer}
            className="p-2 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Streaks */}
      <div className="space-y-1.5 pt-1 border-t border-[hsl(var(--border))]">
        <div className="w-full bg-[hsl(var(--secondary))] h-1.5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${mode === 'study' ? 'bg-rose-500' : 'bg-teal-500'}`}
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
          <span className="flex items-center gap-1 text-amber-500">
            <Flame className="w-3 h-3 fill-amber-500" />
            {completedSessions} Sprints Done Today
          </span>
          <span>{progressPercent}% Complete</span>
        </div>
      </div>
    </div>
  );
};
