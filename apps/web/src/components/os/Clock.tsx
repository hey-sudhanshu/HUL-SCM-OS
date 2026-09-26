'use client';
import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <span className="opacity-0">00:00:00</span>;

  return (
    <span className="font-mono text-sm">
      {time.toLocaleTimeString('en-IN', { hour12: false })}
    </span>
  );
}
