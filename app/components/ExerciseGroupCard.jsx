// 詳細部位ごとの種目一覧と「もっと見る」を表示するカードを作るファイル
"use client";

import { useState } from "react";
export default function ExerciseGroupCard({

  targetMuscle,
  exercises,
}) {
  // 種目一覧を全表示しているかをカードごとに管理する場所
  const [isExpanded, setIsExpanded] = useState(false);
  // 開いている場合は全種目、閉じている場合は最初の3種目を選ぶ場所
  const visibleExercises = isExpanded
  ? exercises
  : exercises.slice(0, 3);
  return (
    <section className="exerciseGroupCard">
      <h3>{targetMuscle}</h3>

      <div className="exercisePreviewList">
        {/* 現在の開閉状態に合った種目を押せる一覧として表示する場所 */}
       {visibleExercises.map((exercise) => (
          <button
            className="exerciseListButton"
            type="button"
            key={exercise.id}
          >
            <span>{exercise.name}</span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      {/* 種目が4件以上ある場合だけ全表示と3件表示を切り替える場所 */}
      {exercises.length > 3 && (
        <button
            className="exerciseMoreButton"
            type="button"
            onClick={() =>
            setIsExpanded((currentIsExpanded) => !currentIsExpanded)
            }
        >
            {isExpanded ? "閉じる" : "もっと見る"}
        </button>
        )}
    </section>
  );
}
