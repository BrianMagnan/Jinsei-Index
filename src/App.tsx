import { useState, useEffect } from "react";
import { categoryAPI, getCurrentUser, setCurrentUser, setAuthToken, authAPI } from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { SkillsList } from "./components/SkillsList";
import { ChallengesList } from "./components/ChallengesList";
import { ProfilesList } from "./components/ProfilesList";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import type { Category, Profile } from "./types";
import "./App.css";

type ViewMode = "main" | "profiles";
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
  };

  const handleSkillSelect = (skillId: string) => {
    setSelectedSkillId(skillId);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset selections when switching views
    if (mode === "profiles") {
      setSelectedCategoryId(null);
      setSelectedSkillId(null);
    }
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
      <nav className="app-nav">
        <div className="nav-left">
          <button
            className={`nav-button ${viewMode === "main" ? "active" : ""}`}
            onClick={() => handleViewModeChange("main")}
          >
            Skills & Challenges
          </button>
          <button
            className={`nav-button ${viewMode === "profiles" ? "active" : ""}`}
            onClick={() => handleViewModeChange("profiles")}
          >
            Profiles
          </button>
        </div>
        <div className="nav-right">
          {currentUser && (
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              {currentUser.totalLevel && (
                <span className="user-level">Level {currentUser.totalLevel}</span>
              )}
            </div>
          )}
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {viewMode === "main" ? (
        <>
          <Sidebar
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
          />
          <main className="app-main">
            {selectedCategoryId && !selectedSkillId && (
              <SkillsList
                categoryId={selectedCategoryId}
                categoryName={selectedCategory?.name || ""}
                onSkillSelect={handleSkillSelect}
              />
            )}
            {selectedSkillId && <ChallengesList skillId={selectedSkillId} />}
            {!selectedCategoryId && (
              <div className="welcome-message">
                <h1>Welcome to Jinsei Index</h1>
                <p>Select a category from the sidebar to get started.</p>
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="app-main profiles-main">
          <ProfilesList />
        </main>
      )}
    </div>
  );
}

export default App;
