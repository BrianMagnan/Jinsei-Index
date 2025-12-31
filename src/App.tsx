import { useState } from "react";
import { CharacterDashboard } from "./components/CharacterDashboard";
import { SkillTree } from "./components/SkillTree";
import { Management } from "./components/Management";
import { CategoryDetail } from "./components/CategoryDetail";
import { SkillDetail } from "./components/SkillDetail";
import { SubSkillDetail } from "./components/SubSkillDetail";
import { Sidebar } from "./components/Sidebar";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState<
    "dashboard" | "skilltree" | "management" | "category" | "skill" | "subskill"
  >("dashboard");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedSubSkillId, setSelectedSubSkillId] = useState<string | null>(
    null
  );

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        selectedCategoryId={selectedCategoryId}
        onViewChange={setActiveView}
        onCategoryClick={(categoryId) => {
          setSelectedCategoryId(categoryId);
        }}
      />

      <main className="app-main">
        {activeView === "dashboard" && <CharacterDashboard />}
        {activeView === "skilltree" && <SkillTree />}
        {activeView === "management" && <Management />}
        {activeView === "category" && selectedCategoryId && (
          <CategoryDetail
            categoryId={selectedCategoryId}
            onBack={() => {
              setActiveView("dashboard");
              setSelectedCategoryId(null);
            }}
            onSkillClick={(skillId) => {
              setSelectedSkillId(skillId);
              setActiveView("skill");
            }}
          />
        )}
        {activeView === "skill" && selectedSkillId && (
          <SkillDetail
            skillId={selectedSkillId}
            onBack={() => {
              if (selectedCategoryId) {
                setActiveView("category");
              } else {
                setActiveView("dashboard");
              }
              setSelectedSkillId(null);
            }}
            onSubSkillClick={(subSkillId) => {
              setSelectedSubSkillId(subSkillId);
              setActiveView("subskill");
            }}
          />
        )}
        {activeView === "subskill" && selectedSubSkillId && (
          <SubSkillDetail
            subSkillId={selectedSubSkillId}
            onBack={() => {
              if (selectedSkillId) {
                setActiveView("skill");
              } else if (selectedCategoryId) {
                setActiveView("category");
              } else {
                setActiveView("dashboard");
              }
              setSelectedSubSkillId(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
