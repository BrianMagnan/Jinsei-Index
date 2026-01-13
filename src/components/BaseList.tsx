import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { useListInteractions } from "../hooks/useListInteractions";

export interface BaseListItem {
  _id: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

export interface BaseListProps<T extends BaseListItem> {
  items: T[];
  selectedItemId: string | null;
  editingItemId: string | null;
  selectionMode: boolean;
  selectedItemIds: Set<string>;
  isMobile: boolean;
  onItemSelect: (itemId: string) => void;
  onItemEdit: (item: T, e?: React.MouseEvent) => void;
  onItemDelete: (itemId: string, itemName: string, e: React.MouseEvent) => void;
  onItemComplete?: (item: T, e: React.MouseEvent) => void; // Optional for Challenges
  getContextMenuItems: (item: T) => ContextMenuItem[];
  onDragStart?: (itemId: string, index: number) => void;
  onDragOver?: (e: React.DragEvent, itemId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, itemId: string, index: number) => void;
  onDragEnd?: () => void;
  onTouchDragStart?: (itemId: string, initialIndex: number) => void;
  onTouchDragMove?: (e: React.TouchEvent, itemId: string) => void;
  onTouchDragEnd?: () => void;
  renderItemContent: (
    item: T,
    selectionMode: boolean,
    selectedItemIds: Set<string>,
    onSelectionToggle: (item: T) => void
  ) => React.ReactNode;
  renderSwipeActions?: (item: T, swipeOffset: number) => React.ReactNode;
  itemClassName?: string;
  listClassName?: string;
  // Additional props for custom drag state (for reordering)
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  touchDragStart?: { itemId: string; initialIndex: number } | null;
  touchDragOffset?: number;
  // Custom item class builder
  getItemClassName?: (item: T, baseClasses: string) => string;
  // Custom style builder
  getItemStyle?: (
    item: T,
    baseStyle: React.CSSProperties
  ) => React.CSSProperties;
}

export function BaseList<T extends BaseListItem>({
  items,
  selectedItemId,
  editingItemId,
  selectionMode,
  selectedItemIds,
  isMobile,
  onItemSelect,
  onItemEdit,
  onItemDelete,
  onItemComplete,
  getContextMenuItems,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  renderItemContent,
  renderSwipeActions,
  itemClassName = "",
  listClassName = "",
  draggedItemId: externalDraggedItemId,
  dragOverItemId: externalDragOverItemId,
  touchDragStart: externalTouchDragStart,
  touchDragOffset: externalTouchDragOffset = 0,
  getItemClassName,
  getItemStyle,
}: BaseListProps<T>) {
  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuItemId, setContextMenuItemId] = useState<string | null>(
    null
  );

  // Handle context menu
  const handleContextMenu = (
    event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
    item: T
  ) => {
    if ("preventDefault" in event) {
      event.preventDefault();
      event.stopPropagation();
    }

    let position: { x: number; y: number };
    if (isMobile) {
      position = { x: 0, y: 0 };
    } else if ("clientX" in event && "clientY" in event) {
      position = { x: event.clientX, y: event.clientY };
    } else {
      position = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    setContextMenuPosition(position);
    setContextMenuItemId(item._id);
  };

  const closeContextMenu = () => {
    setContextMenuPosition(null);
    setContextMenuItemId(null);
  };

  // Use shared interaction hook
  const {
    swipedItemId,
    swipeOffset,
    longPressTriggered,
    handleClick,
    handleDoubleClick,
    handleLongPressStart,
    handleLongPressMove,
    handleLongPressEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useListInteractions({
    items,
    isMobile,
    editingItemId,
    selectionMode,
    onItemSelect,
    onItemEdit,
    onItemDelete,
    onItemComplete,
    onContextMenu: handleContextMenu,
    onDragStart,
    onTouchDragStart,
    onTouchDragMove,
    onTouchDragEnd,
    getItemId: (item) => item._id,
  });

  // Use external drag state if provided, otherwise use hook's internal state
  const draggedItemId = externalDraggedItemId ?? null;
  const dragOverItemId = externalDragOverItemId ?? null;
  const touchDragStart = externalTouchDragStart ?? null;
  const touchDragOffset = externalTouchDragOffset ?? 0;

  // Handle selection toggle
  const handleSelectionToggle = (item: T) => {
    onItemSelect(item._id);
  };

  return (
    <>
      <ul className={listClassName}>
        {items.map((item, index) => {
          const isSelected = selectedItemId === item._id;
          const isSelectedInMode =
            selectionMode && selectedItemIds.has(item._id);
          const isSwiping = swipedItemId === item._id;
          const isDragging =
            draggedItemId === item._id || touchDragStart?.itemId === item._id;
          const isDragOver = dragOverItemId === item._id;

          // Build base classes
          let baseClasses = `${itemClassName} ${isSelected ? "active" : ""} ${
            isSelectedInMode ? "selected" : ""
          } ${isSwiping ? "swiping" : ""} ${isDragging ? "dragging" : ""} ${
            isDragOver ? "drag-over" : ""
          }`.trim();

          // Apply custom class builder if provided
          const finalClassName = getItemClassName
            ? getItemClassName(item, baseClasses)
            : baseClasses;

          // Build base style
          const baseStyle: React.CSSProperties = {
            transform:
              touchDragStart?.itemId === item._id
                ? `translateY(${touchDragOffset}px)`
                : isSwiping
                ? `translateX(${Math.max(-100, Math.min(100, swipeOffset))}px)`
                : undefined,
            transition:
              isDragging || isSwiping ? "none" : "transform 0.2s ease-out",
          };

          // Apply custom style builder if provided
          const finalStyle = getItemStyle
            ? getItemStyle(item, baseStyle)
            : baseStyle;

          return (
            <li
              key={item._id}
              className={finalClassName}
              draggable={
                !isMobile &&
                !editingItemId &&
                !selectionMode &&
                draggedItemId !== item._id &&
                !longPressTriggered
              }
              onDragStart={() => {
                if (!isMobile && !editingItemId) {
                  handleLongPressEnd();
                  if (onDragStart) {
                    onDragStart(item._id, index);
                  }
                }
              }}
              onDragOver={(e) => {
                if (!isMobile && onDragOver) {
                  onDragOver(e, item._id);
                }
              }}
              onDragLeave={() => {
                if (!isMobile && onDragLeave) {
                  onDragLeave();
                }
              }}
              onDrop={(e) => {
                if (!isMobile && onDrop) {
                  onDrop(e, item._id, index);
                }
              }}
              onDragEnd={() => {
                if (!isMobile && onDragEnd) {
                  onDragEnd();
                }
              }}
              onClick={() => handleClick(item)}
              onDoubleClick={(e) => handleDoubleClick(e, item)}
              onContextMenu={(e) => {
                if (!isMobile && !selectionMode) {
                  handleContextMenu(e, item);
                }
              }}
              onMouseDown={(e) => {
                if (
                  e.button === 0 &&
                  !editingItemId &&
                  !selectionMode &&
                  !isMobile
                ) {
                  handleLongPressStart(item, e, index);
                }
              }}
              onMouseMove={(e) => {
                if (!isMobile && !editingItemId && !selectionMode) {
                  handleLongPressMove(item, e, index);
                }
              }}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={(e) => {
                if (editingItemId !== item._id && !selectionMode) {
                  handleTouchStart(e, item, index);
                  if (onTouchDragStart) {
                    const initialIndex = items.findIndex(
                      (i) => i._id === item._id
                    );
                    if (initialIndex >= 0) {
                      onTouchDragStart(item._id, initialIndex);
                    }
                  }
                }
              }}
              onTouchMove={(e) => {
                if (touchDragStart?.itemId === item._id && onTouchDragMove) {
                  onTouchDragMove(e, item._id);
                } else {
                  handleTouchMove(e, item);
                }
              }}
              onTouchEnd={() => {
                handleTouchEnd(item);
                if (onTouchDragEnd) {
                  onTouchDragEnd();
                }
              }}
              onTouchCancel={() => {
                handleTouchCancel();
                if (onTouchDragEnd) {
                  onTouchDragEnd();
                }
              }}
              style={finalStyle}
            >
              {renderItemContent(
                item,
                selectionMode,
                selectedItemIds,
                handleSelectionToggle
              )}
              {renderSwipeActions && isSwiping && (
                <>{renderSwipeActions(item, swipeOffset)}</>
              )}
            </li>
          );
        })}
      </ul>

      {/* Context Menu */}
      {contextMenuPosition && contextMenuItemId && (
        <ContextMenu
          items={getContextMenuItems(
            items.find((i) => i._id === contextMenuItemId)!
          )}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          mobile={isMobile}
        />
      )}
    </>
  );
}
