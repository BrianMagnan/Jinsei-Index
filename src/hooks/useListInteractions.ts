import { useState, useRef, useCallback } from "react";
import { hapticFeedback } from "../utils/haptic";

/**
 * Unified interaction constants for all list components.
 * 
 * INTERACTION MODEL:
 * 
 * Desktop:
 * - Single click: Select item (with 300ms delay to detect double-click)
 * - Double click: Edit item
 * - Right-click: Show context menu immediately
 * - Long-press (600ms, no movement): Show context menu
 * - Long-press (300ms, with movement >10px): Start drag for reordering
 * 
 * Mobile:
 * - Single tap: Select item
 * - Long-press (600ms, no movement): Show context menu (bottom sheet)
 * - Long-press (300ms, with movement >10px): Start drag for reordering
 * - Swipe left (>80px): Delete item
 * - Swipe right (>80px, Challenges only): Complete item
 * 
 * All interactions are unified across Categories, Skills, and Challenges lists.
 */
export const INTERACTION_CONSTANTS = {
  /** Time (ms) before drag can start if movement is detected during long-press */
  DRAG_START_DELAY: 300,
  
  /** Time (ms) before context menu shows if no movement during long-press */
  MENU_DELAY: 600,
  
  /** Distance (px) user must move before drag starts (prevents accidental drags) */
  DRAG_THRESHOLD: 10,
  
  /** Time (ms) to wait after single click before treating it as single (not double) click */
  DOUBLE_CLICK_DELAY: 300,
  
  /** Minimum swipe distance (px) required to trigger delete/complete actions */
  MIN_SWIPE_DISTANCE: 80,
} as const;

export interface UseListInteractionsOptions<T> {
  items: T[];
  isMobile: boolean;
  editingItemId: string | null;
  selectionMode: boolean;
  onItemSelect: (itemId: string) => void;
  onItemEdit: (item: T, e?: React.MouseEvent) => void;
  onItemDelete: (itemId: string, itemName: string, e: React.MouseEvent) => void;
  onItemComplete?: (item: T, e: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent | React.TouchEvent, item: T) => void;
  onDragStart?: (itemId: string, index: number) => void;
  onTouchDragStart?: (itemId: string, initialIndex: number) => void;
  onTouchDragMove?: (e: React.TouchEvent, itemId: string) => void;
  onTouchDragEnd?: () => void;
  getItemId: (item: T) => string;
}

export function useListInteractions<T>({
  items,
  isMobile,
  editingItemId,
  selectionMode,
  onItemSelect,
  onItemEdit,
  onItemDelete,
  onItemComplete,
  onContextMenu,
  onDragStart,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  getItemId,
}: UseListInteractionsOptions<T>) {
  // Swipe gesture state
  const [itemSwipeStart, setItemSwipeStart] = useState<{
    x: number;
    y: number;
    itemId: string;
  } | null>(null);
  const [itemSwipeEnd, setItemSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Long press state
  const longPressTimerRef = useRef<number | null>(null);
  const dragStartTimerRef = useRef<number | null>(null);
  const longPressItemIdRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Track clicks for double-click detection
  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);

  // Touch drag state
  const [touchDragStart, setTouchDragStart] = useState<{
    itemId: string;
    initialIndex: number;
  } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState<number>(0);

  // Desktop drag state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  /**
   * Unified long-press handler for desktop and mobile.
   * 
   * Behavior:
   * - If user moves >10px within 300ms: Start drag (for reordering)
   * - If user doesn't move for 600ms: Show context menu
   * - These two timers run simultaneously and cancel each other based on movement
   */
  const handleLongPressStart = useCallback((
    item: T,
    event: React.MouseEvent | React.TouchEvent,
    index: number
  ) => {
    const itemId = getItemId(item);
    longPressTriggeredRef.current = false;
    hasMovedRef.current = false;
    longPressItemIdRef.current = itemId;

    // Store initial position to track movement
    if ("touches" in event) {
      const touch = event.touches[0];
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      longPressPositionRef.current = { x: event.clientX, y: event.clientY };
    }

    // Timer 1: If movement detected, start drag after 300ms
    dragStartTimerRef.current = window.setTimeout(() => {
      if (
        longPressItemIdRef.current === itemId &&
        hasMovedRef.current && // Only if user moved
        !longPressTriggeredRef.current &&
        !draggedItemId
      ) {
        hapticFeedback.medium();
        if (onDragStart) {
          onDragStart(itemId, index);
        }
        setDraggedItemId(itemId);
        // Cancel menu timer if drag starts
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }, INTERACTION_CONSTANTS.DRAG_START_DELAY);

    // Timer 2: If no movement, show context menu after 600ms
    longPressTimerRef.current = window.setTimeout(() => {
      if (
        longPressItemIdRef.current === itemId &&
        !hasMovedRef.current && // Only if user didn't move
        !longPressTriggeredRef.current
      ) {
        longPressTriggeredRef.current = true;
        hapticFeedback.medium();
        // Cancel drag timer if menu shows
        if (dragStartTimerRef.current) {
          clearTimeout(dragStartTimerRef.current);
          dragStartTimerRef.current = null;
        }
        // Create synthetic event for context menu
        const syntheticEvent = {
          clientX: longPressPositionRef.current?.x || window.innerWidth / 2,
          clientY: longPressPositionRef.current?.y || window.innerHeight / 2,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.MouseEvent;
        onContextMenu(syntheticEvent, item);
      }
    }, INTERACTION_CONSTANTS.MENU_DELAY);
  }, [onDragStart, onContextMenu, draggedItemId, getItemId]);

  /**
   * Track movement during long-press to determine if user wants to drag.
   * If movement >10px detected, cancel menu timer and start drag.
   */
  const handleLongPressMove = useCallback((
    item: T,
    event: React.MouseEvent | React.TouchEvent,
    index: number
  ) => {
    const itemId = getItemId(item);
    if (
      longPressItemIdRef.current !== itemId ||
      longPressTriggeredRef.current
    )
      return;

    const currentX =
      "touches" in event ? event.touches[0].clientX : event.clientX;
    const currentY =
      "touches" in event ? event.touches[0].clientY : event.clientY;

    if (longPressPositionRef.current) {
      const deltaX = Math.abs(currentX - longPressPositionRef.current.x);
      const deltaY = Math.abs(currentY - longPressPositionRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // User moved beyond threshold - they want to drag, not show menu
      if (distance > INTERACTION_CONSTANTS.DRAG_THRESHOLD) {
        hasMovedRef.current = true;

        // Cancel menu timer since user is dragging
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        // Start drag immediately if not already started
        if (!draggedItemId && !dragStartTimerRef.current) {
          hapticFeedback.medium();
          if (onDragStart) {
            onDragStart(itemId, index);
          }
          setDraggedItemId(itemId);
        }

        // Update position for next movement check
        longPressPositionRef.current = { x: currentX, y: currentY };
      }
    }
  }, [onDragStart, draggedItemId, getItemId]);

  const handleLongPressEnd = useCallback(() => {
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 100);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (dragStartTimerRef.current) {
      clearTimeout(dragStartTimerRef.current);
      dragStartTimerRef.current = null;
    }
    longPressItemIdRef.current = null;
    longPressPositionRef.current = null;
    hasMovedRef.current = false;
  }, []);

  /**
   * Handle single click - with delay to detect double-click on desktop.
   * On mobile, immediately selects item.
   */
  const handleClick = useCallback((item: T) => {
    const itemId = getItemId(item);
    // Ignore clicks if other interactions are active
    if (
      longPressTriggeredRef.current ||
      swipedItemId === itemId ||
      draggedItemId ||
      touchDragStart?.itemId === itemId
    ) {
      return;
    }

    if (selectionMode) {
      // In selection mode, immediately toggle selection
      onItemSelect(itemId);
      return;
    } else if (editingItemId !== itemId) {
      if (!isMobile) {
        // Desktop: Wait 300ms to see if it's a double-click
        clickCountRef.current += 1;
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }
        clickTimerRef.current = window.setTimeout(() => {
          // Only select if it was a single click (not double)
          if (
            clickCountRef.current === 1 &&
            !longPressTriggeredRef.current
          ) {
            onItemSelect(itemId);
          }
          clickCountRef.current = 0;
        }, INTERACTION_CONSTANTS.DOUBLE_CLICK_DELAY);
      } else {
        // Mobile: Immediate selection
        onItemSelect(itemId);
      }
    }
  }, [
    swipedItemId,
    draggedItemId,
    touchDragStart,
    selectionMode,
    editingItemId,
    isMobile,
    onItemSelect,
    getItemId,
  ]);

  /**
   * Handle double-click - edit item (desktop only).
   * Cancels single-click timer to prevent selection.
   */
  const handleDoubleClick = useCallback((e: React.MouseEvent, item: T) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isMobile && !selectionMode) {
      // Cancel single-click timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      // Edit item (small delay to ensure click handler doesn't fire)
      setTimeout(() => {
        onItemEdit(item);
      }, 0);
    }
  }, [isMobile, selectionMode, onItemEdit]);

  // Handle swipe gestures
  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    item: T,
    index: number
  ) => {
    const itemId = getItemId(item);
    if (editingItemId !== itemId && !selectionMode) {
      const touch = e.touches[0];
      const initialIndex = items.findIndex((i) => getItemId(i) === itemId);

      handleLongPressStart(item, e, index);
      if (initialIndex >= 0 && onTouchDragStart) {
        onTouchDragStart(itemId, initialIndex);
        setTouchDragStart({ itemId, initialIndex });
      }

      setItemSwipeStart({
        x: touch.clientX,
        y: touch.clientY,
        itemId,
      });
      setItemSwipeEnd(null);
      setSwipeOffset(0);
    }
  }, [
    editingItemId,
    selectionMode,
    items,
    handleLongPressStart,
    onTouchDragStart,
    getItemId,
  ]);

  const handleTouchMove = useCallback((
    e: React.TouchEvent,
    item: T
  ) => {
    const itemId = getItemId(item);
    if (itemSwipeStart && itemSwipeStart.itemId === itemId) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      setItemSwipeEnd({ x: currentX, y: currentY });

      const deltaX = currentX - itemSwipeStart.x;
      const deltaY = Math.abs(currentY - itemSwipeStart.y);

      if (touchDragStart?.itemId === itemId) {
        if (onTouchDragMove) {
          onTouchDragMove(e, itemId);
        }
        handleLongPressEnd();
        setItemSwipeStart(null);
        return;
      }

      if (deltaY < 30) {
        setSwipeOffset(deltaX);
        setSwipedItemId(itemId);
        if (Math.abs(deltaX) > 10) {
          handleLongPressEnd();
          if (onTouchDragEnd) {
            onTouchDragEnd();
          }
          setTouchDragStart(null);
        }
      } else if (deltaY > 30) {
        setItemSwipeStart(null);
        setSwipedItemId(null);
        setSwipeOffset(0);
      }
    }
  }, [
    itemSwipeStart,
    touchDragStart,
    onTouchDragMove,
    onTouchDragEnd,
    handleLongPressEnd,
    getItemId,
  ]);

  const handleTouchEnd = useCallback((item: T) => {
    const itemId = getItemId(item);
    handleLongPressEnd();
    if (onTouchDragEnd) {
      onTouchDragEnd();
    }
    setTouchDragStart(null);
    setTouchDragOffset(0);

    if (
      itemSwipeStart &&
      itemSwipeStart.itemId === itemId &&
      itemSwipeEnd &&
      !touchDragStart
    ) {
      const deltaX = itemSwipeEnd.x - itemSwipeStart.x;
      const deltaY = Math.abs(itemSwipeEnd.y - itemSwipeStart.y);

      if (deltaY < 50 && Math.abs(deltaX) > INTERACTION_CONSTANTS.MIN_SWIPE_DISTANCE) {
        if (deltaX > 0 && onItemComplete) {
          hapticFeedback.success();
          onItemComplete(item, {
            stopPropagation: () => {},
          } as React.MouseEvent);
        } else if (deltaX < 0) {
          hapticFeedback.medium();
          onItemDelete(itemId, (item as any).name, {
            stopPropagation: () => {},
          } as React.MouseEvent);
        }
      }
    }

    setItemSwipeStart(null);
    setItemSwipeEnd(null);
    setSwipedItemId(null);
    setSwipeOffset(0);
  }, [
    itemSwipeStart,
    itemSwipeEnd,
    touchDragStart,
    handleLongPressEnd,
    onTouchDragEnd,
    onItemComplete,
    onItemDelete,
    getItemId,
  ]);

  const handleTouchCancel = useCallback(() => {
    handleLongPressEnd();
    if (onTouchDragEnd) {
      onTouchDragEnd();
    }
    setTouchDragStart(null);
    setTouchDragOffset(0);
    setItemSwipeStart(null);
    setItemSwipeEnd(null);
    setSwipedItemId(null);
    setSwipeOffset(0);
  }, [handleLongPressEnd, onTouchDragEnd]);

  return {
    // State
    swipedItemId,
    swipeOffset,
    draggedItemId,
    touchDragStart,
    touchDragOffset,
    longPressTriggered: longPressTriggeredRef.current,
    
    // Handlers
    handleClick,
    handleDoubleClick,
    handleLongPressStart,
    handleLongPressMove,
    handleLongPressEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    handleDragStart: (itemId: string, index: number) => {
      handleLongPressEnd();
      if (onDragStart) {
        onDragStart(itemId, index);
      }
      setDraggedItemId(itemId);
      hapticFeedback.medium();
    },
  };
}
