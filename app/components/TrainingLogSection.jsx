"use client";

import { useState } from "react";
import { exercisesByBodyPart } from "../lib/training/exerciseOptions";
import ExerciseGroupCard from "./ExerciseGroupCard";

export default function TrainingLogSection() {
  // 利用者が選択した大部位を画面内で管理する場所
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  // 選択中の大部位から詳細部位名の一覧を作る場所
  const targetMuscleOptions = Object.keys(
  exercisesByBodyPart[selectedBodyPart] ?? {}
);
// トレーニング記録の操作部分へ専用CSSを適用する場所
  return (
    <section className="trainingLogPanel">
      {/* 種目カタログの大部位を横並びボタンとして表示する場所 */}
    <div className="bodyPartSelector">
  <p className="trainingFieldLabel">部位</p>

  <div className="bodyPartTabs">
    {Object.keys(exercisesByBodyPart).map((bodyPart) => (
      <button
        className={`bodyPartTab${
          selectedBodyPart === bodyPart ? " active" : ""
        }`}
        type="button"
        key={bodyPart}
        onClick={() => setSelectedBodyPart(bodyPart)}
        aria-pressed={selectedBodyPart === bodyPart}
      >
        {bodyPart}
      </button>
    ))}
  </div>
</div>
    {/* 選択中の大部位に含まれる詳細部位を種目カードとして表示する場所 */}
    {selectedBodyPart && (
  <div className="exerciseGroupList">
    {targetMuscleOptions.map((targetMuscle) => (
      <ExerciseGroupCard
        key={targetMuscle}
        targetMuscle={targetMuscle}
        exercises={
          exercisesByBodyPart[selectedBodyPart][targetMuscle]
        }
      />
    ))}
  </div>
)}
    </section>
  );
}
