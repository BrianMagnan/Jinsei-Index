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
    setSelectedCategoryId(categoryId);
    setSelectedSkillId(null); // Reset skill selection when category changes
    setSidebarOpen(false); // Close sidebar on mobile when category is selected
  };

  const handleSkillSelect = (skillId: string) => {
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
    <div className="app">
      {viewMode === "main" ? (
        <>
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
              />
            )}
            {selectedSkillId && (
              <ChallengesList
                skillId={selectedSkillId}
                initialChallengeId={initialChallengeId}
                onBackToCategory={() => {
                  // Go back to the category's skills page (keep category selected, clear skill)
                  setSelectedSkillId(null);
                  setInitialChallengeId(undefined);
                }}
                onBackToCategories={handleHomeClick}
              />
            )}
            {!selectedCategoryId && (
              <CategoriesList
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={handleCategorySelect}
              />
            )}
          </main>
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
          <main className="app-main todo-main">
            <TodoList onNavigateToChallenge={handleNavigateToChallenge} />
          </main>
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
          <main className="app-main daily-main">
            <DailyList onNavigateToChallenge={handleNavigateToChallenge} />
          </main>
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
          <main className="app-main profiles-main">
            <ProfilesList />
          </main>
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
  );
}

export default App;
