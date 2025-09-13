import { useState, useEffect, useRef, useCallback } from "react";

export const useTimer = (
  aiDuration: string | undefined,
  onUpdateAiDuration?: (id: number, duration: string) => void,
  taskId?: number
) => {
  const [timerActive, setTimerActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const startTimestamp = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getSecondsFromAiDuration = useCallback((duration?: string) => {
    if (!duration) return 0;
    const normalized = duration.replace(/\s+/g, '').toLowerCase();
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
    out += `${s < 10 ? "0" : ""}${s}s`;
    return out.trim();
  }, []);

  const playSoftSound = useCallback(() => {
    const audio = new Audio("/soft-sound.mp3");
    audio.volume = 1;
    audio.play();
  }, []);

  const handleStartTimer = useCallback(() => {
    if (!aiDuration) return;
    startTimestamp.current = Date.now();
    setTimerActive(true);
    setPaused(false);
  }, [aiDuration]);

  const handlePauseTimer = useCallback(() => {
    setPaused(true);
  }, []);

  const handleResumeTimer = useCallback(() => {
    setPaused(false);
  }, []);

  const handleStopTimer = useCallback(() => {
    setTimerActive(false);
    setPaused(false);
    setRemainingSeconds(null);
  }, []);

  useEffect(() => {
    if (!timerActive || paused || startTimestamp.current === null) return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp.current!) / 1000);
      const durationSeconds = getSecondsFromAiDuration(aiDuration);
      const remaining = Math.max(durationSeconds - elapsed, 0);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        playSoftSound();
        setTimerActive(false);
        setPaused(false);
        startTimestamp.current = null;
        setRemainingSeconds(null);
        clearInterval(intervalRef.current!);
        console.log("[Timer] Temporizador finalizado");
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive, paused, aiDuration, getSecondsFromAiDuration, playSoftSound]);

  useEffect(() => {
    setRemainingSeconds(null);
    setTimerActive(false);
    setPaused(false);
    startTimestamp.current = null;
  }, [aiDuration, taskId]);

  return {
    timerActive,
    paused,
    remainingSeconds,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    formatSecondsToAiDuration,
  };
};