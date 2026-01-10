import { useState, useEffect } from "react";
import {
  categoryAPI,
  getCurrentUser,
  setCurrentUser,
  setAuthToken,
  authAPI,
} from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { SkillsList } from "./components/SkillsList";
import { ChallengesList } from "./components/ChallengesList";
import { ProfilesList } from "./components/ProfilesList";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { BottomNav } from "./components/BottomNav";
import { CategoriesModal } from "./components/CategoriesModal";
import { SearchModal } from "./components/SearchModal";
import { CategoriesList } from "./components/CategoriesList";
import { TodoList } from "./components/TodoList";
import { DailyList } from "./components/DailyList";
import { Spinner } from "./components/Spinner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NetworkStatusIndicator } from "./components/NetworkStatusIndicator";
import { hapticFeedback } from "./utils/haptic";
import type { Category, Profile } from "./types";
import "./App.css";

type ViewMode = "main" | "profiles" | "todo" | "daily";
type AuthView = "login" | "register";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUserState] = useState<Profile | null>(null);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [initialChallengeId, setInitialChallengeId] = useState<
    string | undefined
  >(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navDirection, setNavDirection] = useState<
    "forward" | "backward" | null
  >(null);
  // Footer state - managed at App level to avoid transform issues
  const [showCategoryAddForm, setShowCategoryAddForm] = useState(false);
  const [showSkillAddForm, setShowSkillAddForm] = useState(false);
  // ChallengesList footer state
  const [challengeFooterState, setChallengeFooterState] = useState<{
    showAddForm: boolean;
    selectionMode: boolean;
    selectedIds: Set<string>;
    deleting: boolean;
    completing: boolean;
    selectedChallengeId: string | null;
    selectedChallenge: {
      id: string;
      name: string;
      inTodo: boolean;
      inDaily: boolean;
      isDeleting: boolean;
      isUpdating: boolean;
      isCompleting: boolean;
    } | null;
  }>({
    showAddForm: false,
    selectionMode: false,
    selectedIds: new Set(),
    deleting: false,
    completing: false,
    selectedChallengeId: null,
    selectedChallenge: null,
  });
  // CategoriesList and SkillsList footer state (managed via window handlers)
  const [categoryFooterState, setCategoryFooterState] = useState<{
    selectionMode: boolean;
    selectedIds: Set<string>;
    deleting: boolean;
  }>({
    selectionMode: false,
    selectedIds: new Set(),
    deleting: false,
  });
  const [skillFooterState, setSkillFooterState] = useState<{
    selectionMode: boolean;
    selectedIds: Set<string>;
    deleting: boolean;
  }>({
    selectionMode: false,
    selectedIds: new Set(),
    deleting: false,
  });

  // Reset challenge footer state when navigating away from challenges
  useEffect(() => {
    if (!selectedSkillId) {
      setChallengeFooterState({
        showAddForm: false,
        selectionMode: false,
        selectedIds: new Set(),
        deleting: false,
        completing: false,
        selectedChallengeId: null,
        selectedChallenge: null,
      });
    }
  }, [selectedSkillId]);

  // Sync category footer state from window handlers
  useEffect(() => {
    const interval = setInterval(() => {
      const handlers = (window as any).__categoryFooterActions;
      if (handlers) {
        const categorySelectionMode =
          (window as any).__categorySelectionMode || false;
        const categorySelectedIds =
          (window as any).__categorySelectedIds || new Set();
        const categoryDeleting = (window as any).__categoryDeleting || false;

        setCategoryFooterState({
          selectionMode: categorySelectionMode,
          selectedIds: categorySelectedIds,
          deleting: categoryDeleting,
        });
      } else {
        setCategoryFooterState({
          selectionMode: false,
          selectedIds: new Set(),
          deleting: false,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Sync skill footer state from window handlers
  useEffect(() => {
    const interval = setInterval(() => {
      const handlers = (window as any).__skillFooterActions;
      if (handlers) {
        const skillSelectionMode =
          (window as any).__skillSelectionMode || false;
        const skillSelectedIds =
          (window as any).__skillSelectedIds || new Set();
        const skillDeleting = (window as any).__skillDeleting || false;

        setSkillFooterState({
          selectionMode: skillSelectionMode,
          selectedIds: skillSelectedIds,
          deleting: skillDeleting,
        });
      } else {
        setSkillFooterState({
          selectionMode: false,
          selectedIds: new Set(),
          deleting: false,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen && window.innerWidth <= 768) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
    return () => {
      document.body.classList.remove("sidebar-open");
    };
  }, [sidebarOpen]);

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const user = getCurrentUser();
    if (user) {
      // Verify token is still valid
      try {
        const profile = await authAPI.getCurrentUser();
        setCurrentUserState(profile);
        setCurrentUser(profile);
        setIsAuthenticated(true);
      } catch (error) {
        // Token invalid, clear auth
        handleLogout();
      }
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      loadCategory();
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId]);

  const loadCategory = async () => {
    if (!selectedCategoryId) return;
    try {
      const category = await categoryAPI.getById(selectedCategoryId);
      setSelectedCategory(category);
    } catch (err) {
      console.error("Failed to load category:", err);
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    if (categoryId && !selectedCategoryId) {
      // Going forward (down hierarchy): Categories → Skills
      setNavDirection("forward");
    } else if (!categoryId && selectedCategoryId) {
      // Going backward (up hierarchy): Skills → Categories
      setNavDirection("backward");
    }
    setSelectedCategoryId(categoryId);
    setSelectedSkillId(null); // Reset skill selection when category changes
    setSidebarOpen(false); // Close sidebar on mobile when category is selected
  };

  const handleSkillSelect = (skillId: string) => {
    if (skillId && !selectedSkillId) {
      // Going forward (down hierarchy): Skills → Challenges
      setNavDirection("forward");
    } else if (!skillId && selectedSkillId) {
      // Going backward (up hierarchy): Challenges → Skills
      setNavDirection("backward");
    }
    setSelectedSkillId(skillId);
    setSidebarOpen(false); // Close sidebar on mobile when skill is selected
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset selections when switching views
    if (mode === "profiles" || mode === "todo" || mode === "daily") {
      setSelectedCategoryId(null);
      setSelectedSkillId(null);
      setInitialChallengeId(undefined);
    }
  };

  const handleHomeClick = () => {
    // Always navigate to categories (home) and reset all selections
    if (selectedCategoryId || selectedSkillId) {
      setNavDirection("backward");
    }
    setViewMode("main");
    setSelectedCategoryId(null);
    setSelectedSkillId(null);
    setSelectedCategory(null);
    setInitialChallengeId(undefined);
    setSidebarOpen(false);
    setSearchModalOpen(false);
    setCategoriesModalOpen(false);
  };

  const handleNavigateToChallenge = (
    categoryId: string,
    skillId: string,
    challengeId: string
  ) => {
    setViewMode("main");
    setSelectedCategoryId(categoryId);
    setSelectedSkillId(skillId);
    setInitialChallengeId(challengeId);
    setSidebarOpen(false);
    setSearchModalOpen(false);
    setCategoriesModalOpen(false);
  };

  const handleLoginSuccess = (profile: Profile) => {
    setCurrentUserState(profile);
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = (profile: Profile) => {
    setCurrentUserState(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentUserState(null);
    setIsAuthenticated(false);
    setViewMode("main");
    setSelectedCategoryId(null);
    setSelectedSkillId(null);
  };

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        {authView === "login" ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setAuthView("register")}
          />
        ) : (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setAuthView("login")}
          />
        )}
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary>
      <div className="app">
        <NetworkStatusIndicator />
        {viewMode === "main" ? (
          <>
            <ErrorBoundary>
              <Sidebar
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={handleCategorySelect}
                onSkillSelect={handleSkillSelect}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                currentUser={currentUser}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                searchOpen={searchOpen}
                onSearchToggle={() => setSearchOpen(!searchOpen)}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <main className="app-main">
                {selectedCategoryId && !selectedSkillId && (
                  <SkillsList
                    categoryId={selectedCategoryId}
                    category={selectedCategory}
                    onSkillSelect={handleSkillSelect}
                    onCategoryUpdate={() => loadCategory()}
                    onCategoryDelete={() => {
                      setSelectedCategoryId(null);
                      setSelectedCategory(null);
                    }}
                    onBackToCategories={handleHomeClick}
                    navDirection={navDirection}
                    onAnimationComplete={() => setNavDirection(null)}
                    onShowAddForm={showSkillAddForm}
                    onShowAddFormChange={setShowSkillAddForm}
                  />
                )}
                {selectedSkillId && (
                  <ChallengesList
                    skillId={selectedSkillId}
                    initialChallengeId={initialChallengeId}
                    onBackToCategory={() => {
                      // Go back to the category's skills page (keep category selected, clear skill)
                      setNavDirection("backward");
                      setSelectedSkillId(null);
                      setInitialChallengeId(undefined);
                    }}
                    onBackToCategories={handleHomeClick}
                    navDirection={navDirection}
                    onAnimationComplete={() => setNavDirection(null)}
                    onFooterStateChange={setChallengeFooterState}
                  />
                )}
                {!selectedCategoryId && (
                  <CategoriesList
                    selectedCategoryId={selectedCategoryId}
                    onCategorySelect={handleCategorySelect}
                    navDirection={navDirection}
                    onAnimationComplete={() => setNavDirection(null)}
                    onShowAddForm={showCategoryAddForm}
                    onShowAddFormChange={setShowCategoryAddForm}
                  />
                )}
              </main>
            </ErrorBoundary>
            {/* Footer - rendered outside animated containers to prevent jumping */}
            {viewMode === "main" && (
              <>
                {!selectedCategoryId && (
                  <div className="categories-list-footer">
                    {categoryFooterState.selectionMode ? (
                      // Selection mode actions
                      <>
                        <button
                          className="delete-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__categoryFooterActions;
                            if (handlers?.deleteSelected) {
                              handlers.deleteSelected();
                            }
                          }}
                          disabled={
                            categoryFooterState.selectedIds.size === 0 ||
                            categoryFooterState.deleting
                          }
                          title="Delete selected categories"
                        >
                          {categoryFooterState.deleting ? (
                            <>
                              <Spinner size="sm" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <span>🗑️</span>
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                        <button
                          className="select-button active"
                          onClick={() => {
                            const handlers = (window as any)
                              .__categoryFooterActions;
                            if (handlers?.exitSelect) {
                              handlers.exitSelect();
                            }
                          }}
                          title="Exit selection mode"
                        >
                          <span>✓</span>
                          <span>Done</span>
                        </button>
                      </>
                    ) : (
                      // Default list actions
                      <>
                        <button
                          className="select-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__categoryFooterActions;
                            if (handlers?.toggleSelect) {
                              handlers.toggleSelect();
                            }
                          }}
                          title="Select categories"
                        >
                          Select
                        </button>
                        <button
                          className="add-button"
                          onClick={() => {
                            hapticFeedback.light();
                            setShowCategoryAddForm(true);
                          }}
                          title="Add category"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                )}
                {selectedCategoryId && !selectedSkillId && (
                  <div className="categories-list-footer">
                    {skillFooterState.selectionMode ? (
                      // Selection mode actions
                      <>
                        <button
                          className="delete-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__skillFooterActions;
                            if (handlers?.deleteSelected) {
                              handlers.deleteSelected();
                            }
                          }}
                          disabled={
                            skillFooterState.selectedIds.size === 0 ||
                            skillFooterState.deleting
                          }
                          title="Delete selected skills"
                        >
                          {skillFooterState.deleting ? (
                            <>
                              <Spinner size="sm" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <span>🗑️</span>
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                        <button
                          className="select-button active"
                          onClick={() => {
                            const handlers = (window as any)
                              .__skillFooterActions;
                            if (handlers?.exitSelect) {
                              handlers.exitSelect();
                            }
                          }}
                          title="Exit selection mode"
                        >
                          <span>✓</span>
                          <span>Done</span>
                        </button>
                      </>
                    ) : (
                      // Default list actions
                      <>
                        <button
                          className="select-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__skillFooterActions;
                            if (handlers?.toggleSelect) {
                              handlers.toggleSelect();
                            }
                          }}
                          title="Select skills"
                        >
                          Select
                        </button>
                        <button
                          className="add-button"
                          onClick={() => {
                            hapticFeedback.light();
                            setShowSkillAddForm(true);
                          }}
                          title="Add skill"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                )}
                {selectedSkillId && (
                  <div className="categories-list-footer">
                    {challengeFooterState.selectedChallenge ? (
                      // Challenge detail actions
                      <>
                        <button
                          className="challenge-detail-action-button edit"
                          onClick={(e) => {
                            hapticFeedback.light();
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.editChallenge) {
                              handlers.editChallenge(e);
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedChallenge.isDeleting ||
                            challengeFooterState.selectedChallenge.isUpdating ||
                            challengeFooterState.selectedChallenge.isCompleting
                          }
                          title="Edit challenge"
                        >
                          {challengeFooterState.selectedChallenge.isUpdating ? (
                            <>
                              <Spinner size="sm" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <span className="button-icon">✏️</span>
                              <span>Edit</span>
                            </>
                          )}
                        </button>
                        <button
                          className="challenge-detail-action-button delete"
                          onClick={(e) => {
                            hapticFeedback.medium();
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.deleteChallenge) {
                              handlers.deleteChallenge(e);
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedChallenge.isDeleting ||
                            challengeFooterState.selectedChallenge.isUpdating ||
                            challengeFooterState.selectedChallenge.isCompleting
                          }
                          title="Delete challenge"
                        >
                          {challengeFooterState.selectedChallenge.isDeleting ? (
                            <>
                              <Spinner size="sm" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <span className="button-icon">🗑️</span>
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                        <button
                          className={`challenge-detail-action-button list ${
                            challengeFooterState.selectedChallenge.inTodo ||
                            challengeFooterState.selectedChallenge.inDaily
                              ? "in-list"
                              : ""
                          }`}
                          onClick={() => {
                            hapticFeedback.light();
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.openListSelection) {
                              handlers.openListSelection();
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedChallenge.isDeleting ||
                            challengeFooterState.selectedChallenge.isCompleting
                          }
                          title="Add to list"
                        >
                          <span className="button-icon">
                            {challengeFooterState.selectedChallenge.inTodo ||
                            challengeFooterState.selectedChallenge.inDaily
                              ? "✓"
                              : "➕"}
                          </span>
                          <span>
                            {challengeFooterState.selectedChallenge.inTodo ||
                            challengeFooterState.selectedChallenge.inDaily
                              ? "In List"
                              : "+ To List"}
                          </span>
                        </button>
                        <button
                          className="challenge-detail-action-button complete"
                          onClick={(e) => {
                            hapticFeedback.medium();
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.completeChallenge) {
                              handlers.completeChallenge(e);
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedChallenge
                              .isCompleting ||
                            challengeFooterState.selectedChallenge.isDeleting ||
                            challengeFooterState.selectedChallenge.isUpdating
                          }
                          title="Complete challenge"
                        >
                          {challengeFooterState.selectedChallenge
                            .isCompleting ? (
                            <>
                              <Spinner size="sm" />
                              <span>Completing...</span>
                            </>
                          ) : (
                            <>
                              <span className="button-icon">✓</span>
                              <span>Complete</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : challengeFooterState.selectionMode ? (
                      // Selection mode actions
                      <>
                        <button
                          className="delete-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.deleteSelected) {
                              handlers.deleteSelected();
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedIds.size === 0 ||
                            challengeFooterState.deleting
                          }
                          title="Delete selected challenges"
                        >
                          {challengeFooterState.deleting ? (
                            <>
                              <Spinner size="sm" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <span>🗑️</span>
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                        <button
                          className="challenge-detail-action-button complete"
                          onClick={() => {
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.completeSelected) {
                              handlers.completeSelected();
                            }
                          }}
                          disabled={
                            challengeFooterState.selectedIds.size === 0 ||
                            challengeFooterState.completing
                          }
                          title="Complete selected challenges"
                        >
                          {challengeFooterState.completing ? (
                            <>
                              <Spinner size="sm" />
                              <span>Completing...</span>
                            </>
                          ) : (
                            <>
                              <span className="button-icon">✓</span>
                              <span>Complete</span>
                            </>
                          )}
                        </button>
                        <button
                          className="add-to-list-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.openBulkList) {
                              handlers.openBulkList();
                            }
                          }}
                          disabled={challengeFooterState.selectedIds.size === 0}
                          title="Add challenges to list"
                        >
                          <span>+</span>
                          <span>To List</span>
                        </button>
                        <button
                          className="select-button active"
                          onClick={() => {
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.exitSelect) {
                              handlers.exitSelect();
                            }
                          }}
                          title="Exit selection"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      // Default list actions
                      <>
                        <button
                          className="select-button"
                          onClick={() => {
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.toggleSelect) {
                              handlers.toggleSelect();
                            }
                          }}
                          title="Select challenges"
                        >
                          Select
                        </button>
                        <button
                          className="add-button"
                          onClick={() => {
                            hapticFeedback.light();
                            const handlers = (window as any)
                              .__challengeFooterActions;
                            if (handlers?.toggleAdd) {
                              handlers.toggleAdd();
                            }
                          }}
                          title="Add challenge"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            <BottomNav
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onSearchClick={() => setSearchModalOpen(true)}
              onHomeClick={handleHomeClick}
            />
            <CategoriesModal
              isOpen={categoriesModalOpen}
              onClose={() => setCategoriesModalOpen(false)}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
            />
            <SearchModal
              isOpen={searchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              onCategorySelect={handleCategorySelect}
              onSkillSelect={handleSkillSelect}
            />
          </>
        ) : viewMode === "todo" ? (
          <>
            <ErrorBoundary>
              <Sidebar
                selectedCategoryId={null}
                onCategorySelect={() => {}}
                onSkillSelect={handleSkillSelect}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                currentUser={currentUser}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                searchOpen={searchOpen}
                onSearchToggle={() => setSearchOpen(!searchOpen)}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <main className="app-main todo-main">
                <TodoList onNavigateToChallenge={handleNavigateToChallenge} />
              </main>
            </ErrorBoundary>
            <BottomNav
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onSearchClick={() => setSearchModalOpen(true)}
              onHomeClick={handleHomeClick}
            />
            <CategoriesModal
              isOpen={categoriesModalOpen}
              onClose={() => setCategoriesModalOpen(false)}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
            />
            <SearchModal
              isOpen={searchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              onCategorySelect={handleCategorySelect}
              onSkillSelect={handleSkillSelect}
            />
          </>
        ) : viewMode === "daily" ? (
          <>
            <ErrorBoundary>
              <Sidebar
                selectedCategoryId={null}
                onCategorySelect={() => {}}
                onSkillSelect={handleSkillSelect}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                currentUser={currentUser}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                searchOpen={searchOpen}
                onSearchToggle={() => setSearchOpen(!searchOpen)}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <main className="app-main daily-main">
                <DailyList onNavigateToChallenge={handleNavigateToChallenge} />
              </main>
            </ErrorBoundary>
            <BottomNav
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onSearchClick={() => setSearchModalOpen(true)}
              onHomeClick={handleHomeClick}
            />
            <CategoriesModal
              isOpen={categoriesModalOpen}
              onClose={() => setCategoriesModalOpen(false)}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
            />
            <SearchModal
              isOpen={searchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              onCategorySelect={handleCategorySelect}
              onSkillSelect={handleSkillSelect}
            />
          </>
        ) : (
          <>
            <ErrorBoundary>
              <Sidebar
                selectedCategoryId={null}
                onCategorySelect={() => {}}
                onSkillSelect={handleSkillSelect}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                currentUser={currentUser}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                searchOpen={searchOpen}
                onSearchToggle={() => setSearchOpen(!searchOpen)}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <main className="app-main profiles-main">
                <ProfilesList />
              </main>
            </ErrorBoundary>
            <BottomNav
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onSearchClick={() => setSearchModalOpen(true)}
              onHomeClick={handleHomeClick}
            />
            <CategoriesModal
              isOpen={categoriesModalOpen}
              onClose={() => setCategoriesModalOpen(false)}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
            />
            <SearchModal
              isOpen={searchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              onCategorySelect={handleCategorySelect}
              onSkillSelect={handleSkillSelect}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
