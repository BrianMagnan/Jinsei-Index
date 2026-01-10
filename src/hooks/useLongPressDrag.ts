import { useRef, useCallback, useState } from 'react';
import { hapticFeedback } from '../utils/haptic';

interface UseLongPressDragOptions {
  onDragStart?: (id: string, event: React.TouchEvent | React.MouseEvent) => void;
  onDrag?: (id: string, event: React.TouchEvent | React.MouseEvent) => void;
  onDragEnd?: (id: string) => void;
  onLongPress?: (id: string, event: React.TouchEvent | React.MouseEvent) => void;
  dragThreshold?: number; // Distance in pixels before drag starts
  longPressDelay?: number; // Time in ms before menu appears if no movement
  longPressDragDelay?: number; // Time in ms before drag can start (shorter, for immediate drag)
}

export function useLongPressDrag({
  onDragStart,
  onDrag,
  onDragEnd,
  onLongPress,
  dragThreshold = 10,
  longPressDelay = 600, // Menu appears after 600ms if no movement
  longPressDragDelay = 300, // Drag can start after 300ms
}: UseLongPressDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [menuShown, setMenuShown] = useState(false);
  
  const startPosRef = useRef<{ x: number; y: number; id: string | null } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const dragTimerRef = useRef<number | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const menuShownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const menuShownTimeoutRef = useRef<number | null>(null);

  const handleStart = useCallback((
    id: string,
    event: React.TouchEvent | React.MouseEvent
  ) => {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    startPosRef.current = { x: clientX, y: clientY, id };
    currentIdRef.current = id;
    hasMovedRef.current = false;
    menuShownRef.current = false;
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsLongPressed(false);

    // Start timer for drag (shorter delay for immediate drag)
    dragTimerRef.current = window.setTimeout(() => {
      if (currentIdRef.current === id && !menuShownRef.current) {
        isDraggingRef.current = true;
        setIsLongPressed(true);
        hapticFeedback.medium();
        if (onDragStart) {
          onDragStart(id, event);
        }
        setIsDragging(true);
      }
    }, longPressDragDelay);

    // Start timer for menu (longer delay, only if no movement)
    longPressTimerRef.current = window.setTimeout(() => {
      if (currentIdRef.current === id && !hasMovedRef.current && !isDraggingRef.current) {
        menuShownRef.current = true;
        setMenuShown(true);
        setIsLongPressed(true);
        hapticFeedback.medium();
        if (onLongPress) {
          // Pass the original event if available, otherwise just the id
          onLongPress(id, event);
        }
        // Cancel drag timer if menu is shown
        if (dragTimerRef.current) {
          clearTimeout(dragTimerRef.current);
          dragTimerRef.current = null;
        }
      }
    }, longPressDelay);
  }, [onDragStart, onLongPress, longPressDelay, longPressDragDelay]);

  const handleMove = useCallback((
    id: string,
    event: React.TouchEvent | React.MouseEvent
  ) => {
    if (!startPosRef.current || currentIdRef.current !== id) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const deltaX = Math.abs(clientX - startPosRef.current.x);
    const deltaY = Math.abs(clientY - startPosRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If moved beyond threshold, start drag
    if (distance > dragThreshold) {
      hasMovedRef.current = true;
      
      // Cancel menu timer if user is moving
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // If drag timer hasn't fired yet but user is moving, start drag immediately
      if (!isDraggingRef.current && dragTimerRef.current && !menuShownRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
        isDraggingRef.current = true;
        setIsLongPressed(true);
        hapticFeedback.medium();
        if (onDragStart) {
          onDragStart(id, event);
        }
        setIsDragging(true);
      }

      if (isDraggingRef.current && onDrag) {
        onDrag(id, event);
      }
    }
  }, [dragThreshold, onDrag, onDragStart]);

  const handleEnd = useCallback((id: string) => {
    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    if (isDraggingRef.current && onDragEnd) {
      onDragEnd(id);
    }

    // Check if menu was shown - if so, delay reset to prevent onClick
    const wasMenuShown = menuShownRef.current && currentIdRef.current === id;

    // Reset state
    if (currentIdRef.current === id) {
      // If menu was shown, don't reset refs yet - let onClick check menuShown
      // But still clear the timers and currentId so no more events fire
      if (wasMenuShown) {
        // Keep menuShownRef true for a bit so onClick can check it
        // Reset other state immediately
        currentIdRef.current = null;
        startPosRef.current = null;
        hasMovedRef.current = false;
        isDraggingRef.current = false;
        setIsDragging(false);
        
        // Delay reset of menuShown to allow onClick to check it
        menuShownTimeoutRef.current = window.setTimeout(() => {
          menuShownRef.current = false;
          setMenuShown(false);
          setIsLongPressed(false);
          menuShownTimeoutRef.current = null;
        }, 200); // Longer delay to ensure onClick can check
      } else {
        // Reset immediately if menu wasn't shown
        startPosRef.current = null;
        currentIdRef.current = null;
        hasMovedRef.current = false;
        isDraggingRef.current = false;
        setIsDragging(false);
        setIsLongPressed(false);
        menuShownRef.current = false;
        setMenuShown(false);
      }
    }
  }, [onDragEnd]);

  const handleCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    if (menuShownTimeoutRef.current) {
      clearTimeout(menuShownTimeoutRef.current);
      menuShownTimeoutRef.current = null;
    }
    startPosRef.current = null;
    currentIdRef.current = null;
    hasMovedRef.current = false;
    menuShownRef.current = false;
    setMenuShown(false);
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsLongPressed(false);
  }, []);

  return {
    handleStart,
    handleMove,
    handleEnd,
    handleCancel,
    isDragging,
    isLongPressed,
    menuShown,
  };
}
