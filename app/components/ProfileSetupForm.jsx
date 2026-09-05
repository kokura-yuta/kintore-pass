"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROFILE_DRAFT_KEY = "kintore-pas:profile-draft";

const trainingLocations = [
  { value: "home", label: "自宅", description: "自重・ダンベル中心" },
  { value: "gym", label: "ジム", description: "マシン・器具を活用" },
  { value: "both", label: "両方", description: "日によって使い分け" },
];

const weakBodyParts = ["胸", "背中", "肩", "腕", "脚", "腹筋"];

const initialForm = {
  height: "",
  weight: "",
  bodyFat: "",
  trainingLocation: "",
  weeklyFrequency: "",
  sessionMinutes: "",
  weakBodyParts: [],
};

function loadInitialForm() {
  if (typeof window === "undefined") return initialForm;

  try {
    const savedDraft = window.localStorage.getItem(PROFILE_DRAFT_KEY);
    return savedDraft
      ? { ...initialForm, ...JSON.parse(savedDraft) }
      : initialForm;
  } catch {
    return initialForm;
  }
}

export default function ProfileSetupForm() {
  const router = useRouter();
  const [form, setForm] = useState(loadInitialForm);
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setErrors((current) => ({ ...current, [field]: "" }));
    window.localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(nextForm));
  }

  function toggleWeakBodyPart(bodyPart) {
    const nextParts = form.weakBodyParts.includes(bodyPart)
      ? form.weakBodyParts.filter((part) => part !== bodyPart)
      : [...form.weakBodyParts, bodyPart];
    updateField("weakBodyParts", nextParts);
  }

  function validate() {
    const nextErrors = {};
    const height = Number(form.height);
    const weight = Number(form.weight);

    if (!form.height) nextErrors.height = "身長を入力してください。";
    else if (height < 100 || height > 250) nextErrors.height = "100〜250cmで入力してください。";

    if (!form.weight) nextErrors.weight = "体重を入力してください。";
    else if (weight < 30 || weight > 300) nextErrors.weight = "30〜300kgで入力してください。";

    if (form.bodyFat && (Number(form.bodyFat) < 2 || Number(form.bodyFat) > 70)) {
      nextErrors.bodyFat = "2〜70%で入力してください。";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const profileData = {
      heightCm: Number(form.height),
      weightKg: Number(form.weight),
      bodyFatPercentage:
        form.bodyFat
          ? Number(form.bodyFat)
          : null,
      weeklyTrainingDays:
        form.weeklyFrequency
          ? Number(form.weeklyFrequency)
          : null,
      availableMinutes:
        form.sessionMinutes
          ? Number(form.sessionMinutes)
          : null,
      trainingLocation:
        form.trainingLocation || null,
      weakBodyParts:
        form.weakBodyParts.length > 0
          ? form.weakBodyParts
          : null,
    };

    window.localStorage.setItem(
      "kintore-pas:profile-data",
      JSON.stringify(profileData),
    );
    window.localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(form));
    router.push("/initial-analysis");
  }

  return (
    <form className="profileSetupForm" onSubmit={handleSubmit} noValidate>
      <section className="setupCard">
        <div className="setupCardHeading">
          <h2>基本情報</h2>
          <span>必須</span>
        </div>
        <div className="measurementGrid">
          <label className="setupField">
            <span>身長 <b>必須</b></span>
            <div className={`unitInput${errors.height ? " hasError" : ""}`}>
              <input
                type="number"
                inputMode="decimal"
                min="100"
                max="250"
                step="0.1"
                value={form.height}
                onChange={(event) => updateField("height", event.target.value)}
                placeholder="170"
                aria-invalid={Boolean(errors.height)}
              />
              <span>cm</span>
            </div>
            {errors.height && <small role="alert">{errors.height}</small>}
          </label>

          <label className="setupField">
            <span>体重 <b>必須</b></span>
            <div className={`unitInput${errors.weight ? " hasError" : ""}`}>
              <input
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                step="0.1"
                value={form.weight}
                onChange={(event) => updateField("weight", event.target.value)}
                placeholder="65"
                aria-invalid={Boolean(errors.weight)}
              />
              <span>kg</span>
            </div>
            {errors.weight && <small role="alert">{errors.weight}</small>}
          </label>
        </div>

        <label className="setupField optionalField">
          <span>体脂肪率 <em>任意</em></span>
          <div className={`unitInput${errors.bodyFat ? " hasError" : ""}`}>
            <input
              type="number"
              inputMode="decimal"
              min="2"
              max="70"
              step="0.1"
              value={form.bodyFat}
              onChange={(event) => updateField("bodyFat", event.target.value)}
              placeholder="分からなければ空欄でOK"
              aria-invalid={Boolean(errors.bodyFat)}
            />
            <span>%</span>
          </div>
          {errors.bodyFat && <small role="alert">{errors.bodyFat}</small>}
        </label>
      </section>

      <section className="setupCard">
        <div className="setupCardHeading">
          <div>
            <h2>トレーニング場所</h2>
            <p>普段トレーニングする場所を選択</p>
          </div>
          <span className="optionalBadge">任意</span>
        </div>
        <div className="locationOptions">
          {trainingLocations.map((location) => (
            <button
              key={location.value}
              type="button"
              className={`locationOption${form.trainingLocation === location.value ? " selected" : ""}`}
              onClick={() => updateField("trainingLocation", location.value)}
              aria-pressed={form.trainingLocation === location.value}
            >
              <strong>{location.label}</strong>
              <span>{location.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="setupCard">
        <div className="setupCardHeading">
          <div>
            <h2>トレーニング習慣</h2>
            <p>決まっていなければ空欄でOK</p>
          </div>
          <span className="optionalBadge">任意</span>
        </div>
        <div className="selectGrid">
          <label className="setupField">
            <span>週にできる回数</span>
            <select value={form.weeklyFrequency} onChange={(event) => updateField("weeklyFrequency", event.target.value)}>
              <option value="">選択しない</option>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>週{day}回</option>)}
            </select>
          </label>
          <label className="setupField">
            <span>1回に使える時間</span>
            <select value={form.sessionMinutes} onChange={(event) => updateField("sessionMinutes", event.target.value)}>
              <option value="">選択しない</option>
              {[20, 30, 45, 60, 90, 120, 150, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes}分</option>)}
            </select>
          </label>
        </div>

        <fieldset className="weakPartsFieldset">
          <legend>苦手な部位</legend>
          <div className="weakPartOptions">
            {weakBodyParts.map((bodyPart) => (
              <button
                key={bodyPart}
                type="button"
                className={form.weakBodyParts.includes(bodyPart) ? "selected" : ""}
                onClick={() => toggleWeakBodyPart(bodyPart)}
                aria-pressed={form.weakBodyParts.includes(bodyPart)}
              >
                {bodyPart}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <button type="submit" className="goalContinueButton">
        入力内容を保存して次へ
        <span aria-hidden="true">→</span>
      </button>
      <p className="goalPrivacyNote">入力内容はあとからマイページで変更できます。</p>
    </form>
  );
}
