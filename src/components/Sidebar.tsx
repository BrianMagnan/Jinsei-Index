import { useState, useEffect, useRef } from "react";
import { categoryAPI, skillAPI, challengeAPI } from "../services/api";
import type { Category, Profile, Skill, Challenge } from "../types";
import { Search, type SearchResult } from "./Search";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { ConfirmationModal } from "./ConfirmationModal";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";

interface SidebarProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onSkillSelect?: (skillId: string, categoryId: string) => void;
  viewMode: "main" | "profiles" | "todo" | "daily";
  onViewModeChange: (mode: "main" | "profiles" | "todo" | "daily") => void;
  currentUser: Profile | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  searchOpen?: boolean;
  onSearchToggle?: () => void;
}

export function Sidebar({
  selectedCategoryId,
  onCategorySelect,
  onSkillSelect,
  viewMode,
  onViewModeChange,
  currentUser,
  onLogout,
  isOpen = true,
  onClose,
  searchOpen: externalSearchOpen,
  onSearchToggle,
}: SidebarProps) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null
  );
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const searchOpen =
    externalSearchOpen !== undefined ? externalSearchOpen : internalSearchOpen;

  const handleSearchToggle = () => {
    if (onSearchToggle) {
      onSearchToggle();
    } else {
      setInternalSearchOpen(!internalSearchOpen);
    }
  };

  const handleSearchClose = () => {
    if (onSearchToggle) {
      onSearchToggle(); // Toggle to close
    } else {
      setInternalSearchOpen(false);
    }
    setSearchQuery("");
  };

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuCategoryId, setContextMenuCategoryId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Long press state (unified drag + menu)
  const longPressTimerRef = useRef<number | null>(null);
  const dragStartTimerRef = useRef<number | null>(null);
  const longPressCategoryIdRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const dragThreshold = 10; // pixels - movement distance before drag starts
  const DRAG_START_DELAY = 300; // ms - time before drag can start
  const MENU_DELAY = 600; // ms - time before menu shows if no movement

  // Track clicks for double-click detection
  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchOpen) {
      loadAllSkillsAndChallenges();
    }
  }, [searchOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedCategories = orderArray
            .map((id) => data.find((cat: Category) => cat._id === id))
            .filter((cat): cat is Category => cat !== undefined);

          // Add any new categories that aren't in the saved order
          const existingIds = new Set(orderArray);
          const newCategories = data.filter(
            (cat: Category) => !existingIds.has(cat._id)
          );

          // Sort new categories by creation date (oldest first) so newest appear at bottom
          newCategories.sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });

          setCategories([...orderedCategories, ...newCategories]);
        } catch {
          setCategories(data);
        }
      } else {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCategoryOrder = (newOrder: Category[]) => {
    const orderIds = newOrder.map((cat) => cat._id);
    localStorage.setItem("categoryOrder", JSON.stringify(orderIds));
  };

  const handleDragStart = (categoryId: string, _index?: number) => {
    setDraggedCategoryId(categoryId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCategoryId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      setDraggedCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const draggedIndex = categories.findIndex(
      (cat) => cat._id === draggedCategoryId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    setCategories(newCategories);
    saveCategoryOrder(newCategories);
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
    hapticFeedback.success();
  };

  const handleDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const loadAllSkillsAndChallenges = async () => {
    try {
      const [skills, challenges] = await Promise.all([
        skillAPI.getAll(),
        challengeAPI.getAll(),
      ]);
      setAllSkills(skills);
      setAllChallenges(challenges);
    } catch (err) {
      console.error("Failed to load skills and challenges:", err);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSearchResults = (): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search categories
    categories.forEach((category) => {
      if (category.name.toLowerCase().includes(query)) {
        results.push({
          _id: category._id,
          name: category.name,
          type: "category",
        });
      }
    });

    // Search skills
    allSkills.forEach((skill) => {
      if (skill.name.toLowerCase().includes(query)) {
        const categoryId =
          typeof skill.category === "string"
            ? skill.category
            : skill.category._id;
        const categoryName =
          typeof skill.category === "string"
            ? categories.find((c) => c._id === categoryId)?.name
            : skill.category.name;

        results.push({
          _id: skill._id,
          name: skill.name,
          type: "skill",
          categoryId,
          categoryName: categoryName || "Unknown",
        });
      }
    });

    // Search challenges
    allChallenges.forEach((challenge) => {
      if (challenge.name.toLowerCase().includes(query)) {
        const skillId =
          typeof challenge.skill === "string"
            ? challenge.skill
            : challenge.skill._id;
        const skill =
          typeof challenge.skill === "string"
            ? allSkills.find((s) => s._id === skillId)
            : challenge.skill;

        if (skill) {
          const categoryId =
            typeof skill.category === "string"
              ? skill.category
              : skill.category._id;
          const categoryName =
            typeof skill.category === "string"
              ? categories.find((c) => c._id === categoryId)?.name
              : skill.category.name;

          results.push({
            _id: challenge._id,
            name: challenge.name,
            type: "challenge",
            categoryId,
            categoryName: categoryName || "Unknown",
            skillId,
            skillName: skill.name,
          });
        }
      }
    });

    return results;
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || creatingCategory) return;

    setCreatingCategory(true);
    try {
      const newCategory = await categoryAPI.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddForm(false);

      // Add new category to the end of the list and update localStorage order
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newCategory._id);
          localStorage.setItem("categoryOrder", JSON.stringify(orderArray));
        } catch {
          // If parsing fails, just reload
        }
      } else {
        // No saved order, create one with the new category
        localStorage.setItem(
          "categoryOrder",
          JSON.stringify([newCategory._id])
        );
      }

      await loadCategories();
    } catch (err) {
      toast.showError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEditCategory = (category: Category, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    hapticFeedback.light();
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
  };

  // Handle context menu (right-click or long-press)
  const handleContextMenu = (
    event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
    category: Category
  ) => {
    if ('preventDefault' in event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // For mobile, position doesn't matter (bottom sheet style)
    // For desktop, use cursor position
    if (isMobile) {
      // Mobile: bottom sheet style - position will be handled by ContextMenu component
      setContextMenuPosition({ x: 0, y: 0 });
    } else if ('clientX' in event && 'clientY' in event) {
      // Desktop: right-click or mouse event - show menu at cursor position
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    } else {
      // Fallback: center of screen
      setContextMenuPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    
    setContextMenuCategoryId(category._id);
    hapticFeedback.medium();
  };

  // Get context menu items for a category
  const getContextMenuItems = (category: Category): ContextMenuItem[] => {
    return [
      {
        label: "Edit",
        icon: "✎",
        action: () => {
          handleEditCategory(category);
          setContextMenuPosition(null);
          setContextMenuCategoryId(null);
        },
      },
      {
        label: "Delete",
        icon: "🗑️",
        action: () => {
          handleDeleteCategory(category._id, category.name, {
            stopPropagation: () => {},
          } as React.MouseEvent);
          setContextMenuPosition(null);
          setContextMenuCategoryId(null);
        },
        destructive: true,
      },
    ];
  };

  // Unified long-press handlers: drag with movement, menu without movement
  const handleLongPressStart = (category: Category, event: React.MouseEvent | React.TouchEvent, _index: number) => {
    longPressTriggeredRef.current = false;
    hasMovedRef.current = false;
    longPressCategoryIdRef.current = category._id;
    
    // Store initial position for movement detection
    if ('touches' in event) {
      const touch = event.touches[0];
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      longPressPositionRef.current = { x: event.clientX, y: event.clientY };
    }
    
    // Start drag timer (shorter - 300ms) - enables drag after this delay if movement occurs
    dragStartTimerRef.current = window.setTimeout(() => {
      if (longPressCategoryIdRef.current === category._id && hasMovedRef.current && !longPressTriggeredRef.current && !draggedCategoryId) {
        // 300ms passed and movement detected - start drag
        hapticFeedback.medium();
        handleDragStart(category._id);
        // Cancel menu timer since we're dragging
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }, DRAG_START_DELAY);
    
    // Start menu timer (longer - 600ms, only if no movement)
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressCategoryIdRef.current === category._id && !hasMovedRef.current && !longPressTriggeredRef.current) {
        // No movement - show menu
        longPressTriggeredRef.current = true;
        hapticFeedback.medium();
        // Cancel drag timer if it's still running
        if (dragStartTimerRef.current) {
          clearTimeout(dragStartTimerRef.current);
          dragStartTimerRef.current = null;
        }
        // Show context menu
        const syntheticEvent = {
          clientX: longPressPositionRef.current?.x || window.innerWidth / 2,
          clientY: longPressPositionRef.current?.y || window.innerHeight / 2,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.MouseEvent;
        handleContextMenu(syntheticEvent, category);
      }
    }, MENU_DELAY);
  };

  const handleLongPressMove = (category: Category, event: React.MouseEvent | React.TouchEvent, _index: number) => {
    if (longPressCategoryIdRef.current !== category._id || longPressTriggeredRef.current) return;
    
    // Get current position
    const currentX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const currentY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    if (longPressPositionRef.current) {
      // Calculate movement distance
      const deltaX = Math.abs(currentX - longPressPositionRef.current.x);
      const deltaY = Math.abs(currentY - longPressPositionRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // If moved beyond threshold, mark as moved
      if (distance > dragThreshold) {
        hasMovedRef.current = true;
        
        // Cancel menu timer if user is moving
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        
        // Start drag if enough time has passed (DRAG_START_DELAY) and movement detected
        if (!draggedCategoryId && !dragStartTimerRef.current) {
          // Timer already fired (300ms passed) - start drag immediately since movement detected
          hapticFeedback.medium();
          handleDragStart(category._id);
        }
        
        // Update position
        longPressPositionRef.current = { x: currentX, y: currentY };
      }
    }
  };

  const handleLongPressEnd = () => {
    // Reset the flag after a short delay to allow click handler to check it
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
    longPressCategoryIdRef.current = null;
    longPressPositionRef.current = null;
    hasMovedRef.current = false;
  };

  const handleUpdateCategory = async (
    categoryId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (updatingCategory === categoryId) return;

    hapticFeedback.medium();
    setUpdatingCategory(categoryId);
    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || undefined,
      });
      setEditingCategoryId(null);
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setUpdatingCategory(null);
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });

  const handleDeleteCategory = (
    categoryId: string,
    categoryName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingCategory === categoryId) return;

    setDeleteConfirmation({
      isOpen: true,
      categoryId,
      categoryName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.categoryId) return;

    const categoryId = deleteConfirmation.categoryId;
    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    setDeletingCategory(categoryId);
    try {
      await categoryAPI.delete(categoryId);
      if (selectedCategoryId === categoryId) {
        onCategorySelect(null); // Clear selection if deleted
      }
      await loadCategories();
    } catch (err) {
      toast.showError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    } finally {
      setDeletingCategory(null);
    }
  };

  // Close menu and search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        (menuOpen || searchOpen) &&
        !target.closest(".sidebar-menu-container")
      ) {
        setMenuOpen(false);
        if (searchOpen) {
          handleSearchClose();
        }
      }
    };

    if (menuOpen || searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, searchOpen]);

  return (
    <>
      {onClose && (
        <div
          className={`sidebar-overlay ${isOpen ? "open" : ""}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {onClose && (
          <button
            className="sidebar-close-button"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        )}
        <div className="sidebar-header">
          <div className="sidebar-title-section">
            <div className="sidebar-menu-container">
              {currentUser && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{currentUser.name}</span>
                </div>
              )}
              <div className="sidebar-header-actions">
                <button
                  className="search-icon-button"
                  onClick={() => {
                    handleSearchToggle();
                    if (searchOpen) {
                      setMenuOpen(false);
                    }
                  }}
                  aria-label="Toggle search"
                  title="Search categories"
                >
                  🔍
                </button>
                <button
                  className={`hamburger-menu ${menuOpen ? "active" : ""}`}
                  onClick={() => {
                    setMenuOpen(!menuOpen);
                    if (menuOpen && searchOpen) {
                      handleSearchClose();
                    }
                  }}
                  aria-label="Toggle menu"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              </div>
              {menuOpen && (
                <div className="sidebar-menu">
                  <button
                    className={`sidebar-menu-item ${
                      viewMode === "main" ? "active" : ""
                    }`}
                    onClick={() => {
                      onViewModeChange("main");
                      setMenuOpen(false);
                    }}
                  >
                    Home
                  </button>
                  <button
                    className={`sidebar-menu-item ${
                      viewMode === "profiles" ? "active" : ""
                    }`}
                    onClick={() => {
                      onViewModeChange("profiles");
                      setMenuOpen(false);
                    }}
                  >
                    My Profile
                  </button>
                  <button
                    className="sidebar-menu-item logout"
                    onClick={() => {
                      onLogout();
                      setMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {showAddForm && (
            <form className="add-form" onSubmit={handleCreateCategory}>
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                autoFocus
              />

              <div className="form-actions">
                <button type="submit" disabled={creatingCategory}>
                  {creatingCategory ? (
                    <>
                      <Spinner size="sm" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={creatingCategory}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <ul className="category-list">
              <CategorySkeletonList count={6} />
            </ul>
          ) : (
            <>
              {filteredCategories.length === 0 && searchQuery ? (
                <div className="sidebar-empty">
                  No categories match "{searchQuery}"
                </div>
              ) : (
                <ul className="category-list">
                  {filteredCategories.map((category, index) => (
                    <li
                      key={category._id}
                      className={`category-item ${
                        selectedCategoryId === category._id ? "active" : ""
                      } ${
                        draggedCategoryId === category._id ? "dragging" : ""
                      } ${
                        dragOverCategoryId === category._id ? "drag-over" : ""
                      } ${contextMenuCategoryId === category._id ? "context-menu-active" : ""}`}
                      draggable={!isMobile && !editingCategoryId && draggedCategoryId !== category._id && !longPressTriggeredRef.current && (hasMovedRef.current || dragStartTimerRef.current === null)}
                      onDragStart={() => {
                        if (!isMobile && !editingCategoryId) {
                          // Cancel long-press timers when native drag starts
                          handleLongPressEnd();
                          handleDragStart(category._id, index);
                        }
                      }}
                      onDragOver={(e) => {
                        if (!isMobile) {
                          handleDragOver(e, category._id);
                        }
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        if (!isMobile) {
                          handleDrop(e, category._id, index);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        // Don't trigger select if context menu is active or dragging
                        if (contextMenuPosition || draggedCategoryId || editingCategoryId === category._id) {
                          return;
                        }

                        // Handle double-click detection (desktop only)
                        if (!isMobile) {
                          clickCountRef.current += 1;
                          
                          // Clear existing timer
                          if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                          }
                          
                          // Wait to see if it's a double-click
                          clickTimerRef.current = window.setTimeout(() => {
                            // Single click - select category (only if long-press wasn't triggered)
                            if (clickCountRef.current === 1 && !longPressTriggeredRef.current) {
                              onCategorySelect(category._id);
                            }
                            clickCountRef.current = 0;
                          }, 300); // 300ms delay to detect double-click
                        } else {
                          // Mobile: immediate select
                          onCategorySelect(category._id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Desktop: double-click to edit
                        if (!isMobile) {
                          // Clear single-click timer immediately
                          if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                            clickTimerRef.current = null;
                          }
                          clickCountRef.current = 0;
                          // Small delay to ensure onClick doesn't fire
                          setTimeout(() => {
                            handleEditCategory(category);
                          }, 0);
                        }
                      }}
                      onContextMenu={(e) => {
                        // Desktop: right-click to show context menu
                        if (!isMobile) {
                          handleContextMenu(e, category);
                        }
                      }}
                      onMouseDown={(e) => {
                        // Desktop: long-press for drag (with movement) or menu (without movement)
                        if (e.button === 0 && !editingCategoryId && !isMobile) {
                          handleLongPressStart(category, e, index);
                        }
                      }}
                      onMouseMove={(e) => {
                        // Desktop: track movement during long-press
                        if (!isMobile && !editingCategoryId && longPressCategoryIdRef.current === category._id) {
                          handleLongPressMove(category, e, index);
                        }
                      }}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                    >
                      <span className="category-name">{category.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        {viewMode === "main" && (
          <div className="sidebar-footer">
            <button
              className="add-button"
              onClick={() => setShowAddForm(!showAddForm)}
              title="Add category"
            >
              +
            </button>
          </div>
        )}
        <Search
          isOpen={searchOpen}
          onClose={handleSearchClose}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          results={getSearchResults()}
          onSelect={(result) => {
            if (result.type === "category") {
              onCategorySelect(result._id);
            } else if (result.type === "skill" && result.categoryId) {
              onCategorySelect(result.categoryId);
              if (onSkillSelect) {
                // Use setTimeout to ensure category is selected first
                setTimeout(() => {
                  onSkillSelect(result._id, result.categoryId!);
                }, 100);
              }
            } else if (
              result.type === "challenge" &&
              result.categoryId &&
              result.skillId
            ) {
              onCategorySelect(result.categoryId);
              if (onSkillSelect) {
                // Use setTimeout to ensure category is selected first
                setTimeout(() => {
                  onSkillSelect(result.skillId!, result.categoryId!);
                }, 100);
              }
            }
            // Modal will be closed by the Search component's handleSelect
          }}
          placeholder="Search categories, skills, and challenges..."
          emptyMessage={`No results match "${searchQuery}"`}
        />
      </aside>

      {/* Edit Category Modal */}
      {editingCategoryId && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setEditingCategoryId(null);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const category = categories.find(
                (c) => c._id === editingCategoryId
              );
              if (!category) return null;

              return (
                <>
                  <div className="challenge-action-modal-header">
                    <h3>Edit Category</h3>
                    <button
                      className="challenge-action-modal-close"
                      onClick={() => {
                        hapticFeedback.light();
                        setEditingCategoryId(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateCategory(category._id, e)}
                  >
                    <div className="auth-field">
                      <label htmlFor="edit-category-name-sidebar">Name *</label>
                      <input
                        id="edit-category-name-sidebar"
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="auth-field">
                      <label htmlFor="edit-category-description-sidebar">
                        Description
                      </label>
                      <textarea
                        id="edit-category-description-sidebar"
                        value={editCategoryDescription}
                        onChange={(e) =>
                          setEditCategoryDescription(e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                    <div className="edit-form-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          hapticFeedback.light();
                          setEditingCategoryId(null);
                        }}
                        disabled={updatingCategory === category._id}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="save-button"
                        disabled={updatingCategory === category._id}
                      >
                        {updatingCategory === category._id ? (
                          <>
                            <Spinner size="sm" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenuPosition && contextMenuCategoryId && (
        <ContextMenu
          items={getContextMenuItems(
            categories.find((c) => c._id === contextMenuCategoryId)!
          )}
          position={contextMenuPosition}
          onClose={() => {
            setContextMenuPosition(null);
            setContextMenuCategoryId(null);
          }}
          mobile={isMobile}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${deleteConfirmation.categoryName}"? This will also delete all associated skills and challenges.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deletingCategory === deleteConfirmation.categoryId}
      />
    </>
  );
}
