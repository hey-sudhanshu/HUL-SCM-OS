'use client';
import { useRef, useEffect, useState } from 'react';
import { useOSStore } from '@/lib/store/os';
import { X, Minus, Maximize2, Square } from 'lucide-react';
import clsx from 'clsx';

interface WindowProps {
  id: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  children: React.ReactNode;
}

export function Window({ id, children }: WindowProps) {
  const windowState = useOSStore(state => state.windows[id]);
  const focusWindow = useOSStore(state => state.focusWindow);
  const closeWindow = useOSStore(state => state.closeWindow);
  const minimizeWindow = useOSStore(state => state.minimizeWindow);
  const toggleMaximizeWindow = useOSStore(state => state.toggleMaximizeWindow);
  const updatePosition = useOSStore(state => state.updateWindowPosition);
  const updateSize = useOSStore(state => state.updateWindowSize);
  const focusedWindowId = useOSStore(state => state.focusedWindowId);
  
  const isFocused = focusedWindowId === id;
  const isMaximized = windowState?.isMaximized;
  
  const winRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, winW: 0, winH: 0 });

  
  if (!windowState) {
    return <div className="absolute top-10 left-10 p-4 bg-red-500 text-white z-50">ERROR: NO WINDOW STATE FOR {id}</div>;
  }


  const handlePointerDown = (e: React.PointerEvent) => {
    focusWindow(id);
  };

  const handleTitlePointerDown = (e: React.PointerEvent) => {
    if (isMaximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      winX: windowState.position.x,
      winY: windowState.position.y
    };
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    updatePosition(id, {
      x: dragStart.current.winX + dx,
      y: Math.max(28, dragStart.current.winY + dy) // prevent dragging under menu bar
    });
  };

  const handleTitlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (isMaximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      winW: windowState.size.width,
      winH: windowState.size.height
    };
    e.stopPropagation();
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    updateSize(id, {
      width: Math.max(300, resizeStart.current.winW + dx),
      height: Math.max(200, resizeStart.current.winH + dy)
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    setIsResizing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const isMinimized = windowState.isMinimized;

  const winStyle = isMaximized 
    ? { top: 30, left: 0, width: '100%', height: 'calc(100% - 54px)', zIndex: windowState.zIndex }
    : {
        top: windowState.position.y,
        left: windowState.position.x,
        width: windowState.size.width,
        height: isMinimized ? 24 : windowState.size.height,
        zIndex: windowState.zIndex
      };

  return (
    <div
      ref={winRef}
      onPointerDown={handlePointerDown}
      className={clsx(
        "os-window absolute pointer-events-auto",
        isMaximized && "border-0 shadow-none border-t border-sys-black"
      )}
      style={winStyle}
    >
      <div className="os-window-inner">
        {/* Titlebar */}
        <div 
          className={clsx(
            "os-titlebar select-none shrink-0",
            !isFocused && "inactive"
          )}
          onPointerDown={handleTitlePointerDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerUp}
          onPointerCancel={handleTitlePointerUp}
          onDoubleClick={() => isMinimized ? useOSStore.getState().restoreWindow(id) : useOSStore.getState().minimizeWindow(id)}
        >
          <div 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => closeWindow(id)}
            className="os-close-box"
          />

          <div className="os-titlebar-text leading-none flex items-center">
            {windowState.title}
          </div>

          <div 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => toggleMaximizeWindow(id)}
            className="os-zoom-box flex items-center justify-center"
          >
            <div className="w-2 h-2 border border-sys-black border-t-2" />
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="os-content relative">
            {children}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {!isMaximized && !isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-10"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--sys-black)">
             <path d="M8 8H10V10H8V8ZM4 8H6V10H4V8ZM8 4H10V6H8V4Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
