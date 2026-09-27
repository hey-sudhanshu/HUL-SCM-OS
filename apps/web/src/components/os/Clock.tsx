'use client';

import React, { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return <span className="font-mono text-xs text-[#94a3b8]">--:--:--</span>;
  }

  const timeString = time.toLocaleTimeString('en-US', { hour12: false });
  const dateString = time.toLocaleDateString('en-US');

  return (
    <span className="font-mono text-xs text-[#e2e8f0] cursor-default" title={dateString}>
      {timeString}
    </span>
  );
}
