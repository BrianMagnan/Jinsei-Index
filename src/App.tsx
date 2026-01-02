import { useState, useEffect } from "react";
import { categoryAPI } from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { SkillsList } from "./components/SkillsList";
import { ChallengesList } from "./components/ChallengesList";
import type { Category } from "./types";
import "./App.css";

function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

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

  return (
    <div className="app">
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
    </div>
  );
}

export default App;
