import { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
  mobile?: boolean; // If true, shows as bottom sheet; if false, shows as dropdown
}

export function ContextMenu({ items, position, onClose, mobile = false }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Close on outside click/touch
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // Prevent scrolling when menu is open on mobile
    if (mobile) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [position, onClose, mobile]);

  if (!position) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    item.action();
    onClose();
  };

  if (mobile) {
    // Mobile: Bottom sheet style
    return (
      <>
        <div className="context-menu-overlay" onClick={onClose} />
        <div
          ref={menuRef}
          className="context-menu context-menu-mobile"
          style={{ bottom: 0 }}
        >
          <div className="context-menu-handle" />
          <div className="context-menu-items-mobile">
            {items.map((item, index) => (
              <button
                key={index}
                className={`context-menu-item context-menu-item-mobile ${
                  item.destructive ? 'destructive' : ''
                } ${item.disabled ? 'disabled' : ''}`}
                onClick={() => !item.disabled && handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                <span className="context-menu-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Desktop: Dropdown style positioned at cursor
  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div
        ref={menuRef}
        className="context-menu context-menu-desktop"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="context-menu-items-desktop">
          {items.map((item, index) => (
            <button
              key={index}
              className={`context-menu-item context-menu-item-desktop ${
                item.destructive ? 'destructive' : ''
              } ${item.disabled ? 'disabled' : ''}`}
              onClick={() => !item.disabled && handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span className="context-menu-icon">{item.icon}</span>}
              <span className="context-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
