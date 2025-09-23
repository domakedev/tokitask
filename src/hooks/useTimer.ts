import { useState, useEffect, useRef, useCallback } from "react";
import { useTimerStore } from "../stores/timerStore";

export const useTimer = (
  aiDuration: string | undefined,
  baseDuration: string | undefined,
  onUpdateAiDuration?: (id: string, duration: string) => void,
  taskId?: string
) => {
  const { activeTimer, setActiveTimer, clearActiveTimer, pauseTimer, resumeTimer } = useTimerStore();

  // Estado local para sincronización
  const [localTimerActive, setLocalTimerActive] = useState(false);
  const [localPaused, setLocalPaused] = useState(false);
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number | null>(null);

  const startTimestamp = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getSecondsFromAiDuration = useCallback((duration?: string) => {
    if (!duration) return 0;
    const normalized = duration.replace(/\s+/g, '').toLowerCase();
    // Check for hh:mm format
    const timeMatch = normalized.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      return h * 3600 + m * 60;
    }
    const match = normalized.match(/(\d+)h(\d+)?m?/);
    if (match) {
      const h = parseInt(match[1] || "0", 10);
      const m = parseInt(match[2] || "0", 10);
      return h * 3600 + m * 60;
    }
    const minMatch = normalized.match(/(\d+)(m|min)/);
    if (minMatch) return parseInt(minMatch[1], 10) * 60;
    const hourMatch = normalized.match(/(\d+)h/);
    if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;
    return 0;
  }, []);

  const formatSecondsToAiDuration = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let out = "";
    if (h > 0) out += `${h}h `;
    if (m > 0 || h > 0) out += `${m}m `;
    out += `${s < 10 ? "0" : ""}${Math.trunc(s)}s`;
    return out.trim();
  }, []);

  const playSoftSound = useCallback(() => {
    const audio = new Audio("/soft-sound.mp3");
    audio.volume = 1;
    audio.play();
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setLocalRemainingSeconds(prev => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Defer state updates to avoid setState during render
          setTimeout(() => {
            playSoftSound();
            clearActiveTimer();
            setLocalTimerActive(false);
            setLocalPaused(false);
            setLocalRemainingSeconds(null);
            startTimestamp.current = null;
            console.log(`[Timer] Temporizador finalizado a las ${new Date().toISOString()}`);
          }, 0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playSoftSound, clearActiveTimer]);

  const effectiveDuration = aiDuration || baseDuration;

  const handleStartTimer = useCallback(() => {
    if (!effectiveDuration || !taskId) return;

    // Si hay otro temporizador activo, lo detenemos primero
    if (activeTimer && activeTimer.taskId !== taskId) {
      clearActiveTimer();
    }

    const durationSeconds = getSecondsFromAiDuration(effectiveDuration);

    const now = Date.now();
    startTimestamp.current = now;

    setActiveTimer({
      taskId,
      startTimestamp: now,
      paused: false,
      initialDuration: durationSeconds,
      effectiveDuration,
      isUsingBaseDuration: !aiDuration && !!baseDuration,
    });

    setLocalTimerActive(true);
    setLocalPaused(false);
    setLocalRemainingSeconds(durationSeconds);
    startInterval();

    console.log(`[Timer] Temporizador iniciado a las ${new Date().toISOString()}`);
  }, [effectiveDuration, taskId, activeTimer, setActiveTimer, clearActiveTimer, aiDuration, baseDuration, getSecondsFromAiDuration, startInterval]);

  const handlePauseTimer = useCallback(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pauseTimer();
      setLocalPaused(true);
    }
  }, [activeTimer, taskId, pauseTimer]);

  const handleResumeTimer = useCallback(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      startInterval();
      resumeTimer();
      setLocalPaused(false);
    }
  }, [activeTimer, taskId, resumeTimer, startInterval]);

  const handleStopTimer = useCallback(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearActiveTimer();
      setLocalTimerActive(false);
      setLocalPaused(false);
      setLocalRemainingSeconds(null);
      startTimestamp.current = null;
    }
  }, [activeTimer, taskId, clearActiveTimer]);


  // Sincronizar estado local con el store global
  useEffect(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      setLocalTimerActive(true);
      setLocalPaused(activeTimer.paused);
      startTimestamp.current = activeTimer.startTimestamp;
      // Calculate remaining
      const elapsed = activeTimer.startTimestamp ? (Date.now() - activeTimer.startTimestamp) / 1000 : 0;
      const remaining = Math.max((activeTimer.initialDuration || 0) - elapsed, 0);
      setLocalRemainingSeconds(remaining);
      if (!activeTimer.paused) {
        startInterval();
      }
    } else {
      setLocalTimerActive(false);
      setLocalPaused(false);
      setLocalRemainingSeconds(null);
      startTimestamp.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeTimer, taskId, startInterval]);

  // Limpiar cuando cambie la duración o el taskId
  useEffect(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      // Si hay un temporizador activo para esta tarea, mantenerlo
      return;
    }
    setLocalRemainingSeconds(null);
    setLocalTimerActive(false);
    setLocalPaused(false);
    startTimestamp.current = null;
  }, [effectiveDuration, taskId, activeTimer]);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);



  return {
    timerActive: localTimerActive,
    paused: localPaused,
    remainingSeconds: localRemainingSeconds,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    formatSecondsToAiDuration,
    effectiveDuration: activeTimer?.effectiveDuration || effectiveDuration,
    isUsingBaseDuration: activeTimer?.isUsingBaseDuration || (!aiDuration && !!baseDuration),
  };
};