"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FeatureCard from "./FeatureCard";

const GOAL_BODY_TYPE_KEY = "kintore-pas:goal-body-type";
const GOAL_IMAGE_NAME_KEY = "kintore-pas:goal-image-name";

const bodyTypes = [
  {
    name: "細マッチョ",
    image: "/images/body-types/lean-muscle.png",
    description: "体脂肪を抑えた、引き締まった体型",
  },
  {
    name: "逆三角形",
    image: "/images/body-types/v-shape.png",
    description: "肩と背中が広く、ウエストが細い体型",
  },
  {
    name: "フィジーク",
    image: "/images/body-types/physique.png",
    description: "肩・胸・背中のバランスを重視した体型",
  },
  {
    name: "バルクアップ",
    image: "/images/body-types/bulk-up.png",
    description: "身体全体の筋肉量とサイズを重視した体型",
  },
];

export default function IdealBodySection() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedBodyType = window.localStorage.getItem(GOAL_BODY_TYPE_KEY);
    if (savedBodyType) {
      setSelectedBodyType(savedBodyType);
    }
  }, []);

  function handleBodyTypeSelect(bodyTypeName) {
    setSelectedBodyType(bodyTypeName);
    setReferenceImage(null);
    setReferenceImagePreview("");
    setErrorMessage("");
  }

  function handleReferenceImageChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setErrorMessage("画像ファイルを選択してください。");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage("画像は5MB以下のものを選択してください。");
      return;
    }

    setSelectedBodyType("");
    setReferenceImage(selectedFile);
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = () => setReferenceImagePreview(String(reader.result ?? ""));
    reader.readAsDataURL(selectedFile);
  }

  function handleContinue() {
    if (!selectedBodyType && !referenceImage) {
      setErrorMessage("目標にする体型または参考画像を選んでください。");
      return;
    }

    if (selectedBodyType) {
      window.localStorage.setItem(GOAL_BODY_TYPE_KEY, selectedBodyType);
      window.localStorage.removeItem(GOAL_IMAGE_NAME_KEY);
    } else if (referenceImage) {
      window.localStorage.setItem(GOAL_BODY_TYPE_KEY, "アップロード画像");
      window.localStorage.setItem(GOAL_IMAGE_NAME_KEY, referenceImage.name);
    }

    router.push("/profile-setup");
  }

  const currentChoice = selectedBodyType || referenceImage?.name || "未選択";

  return (
    <FeatureCard
      number="01"
      title="理想の体を選ぶ"
      description="なりたい体に一番近いものを1つ選んでください。"
    >
      <div className="bodyTypeButtons">
        {bodyTypes.map((bodyType) => {
          const isSelected = selectedBodyType === bodyType.name;

          return (
            <button
              key={bodyType.name}
              type="button"
              className={`bodyTypeButton${isSelected ? " selected" : ""}`}
              onClick={() => handleBodyTypeSelect(bodyType.name)}
              aria-pressed={isSelected}
            >
              <img
                src={bodyType.image}
                alt={`${bodyType.name}の見本`}
                className="bodyTypeImage"
              />
              <span className="bodyTypeName">{bodyType.name}</span>
              <span className="bodyTypeDescription">{bodyType.description}</span>
              <span className="bodyTypeCheck" aria-hidden="true">✓</span>
            </button>
          );
        })}
      </div>

      <div className="goalDivider"><span>または</span></div>

      <div className="goalUploadPanel">
        <div>
          <p className="goalUploadTitle">自分で参考画像を選ぶ</p>
          <p className="goalUploadHint">JPG・PNGなど、5MBまで</p>
        </div>
        <button
          type="button"
          className="goalUploadButton"
          onClick={() => fileInputRef.current?.click()}
        >
          画像を選択
        </button>
        <input
          ref={fileInputRef}
          className="visuallyHidden"
          type="file"
          accept="image/*"
          onChange={handleReferenceImageChange}
        />
      </div>

      {referenceImagePreview && (
        <div className="goalImagePreviewWrap">
          <img
            src={referenceImagePreview}
            alt="選択した参考画像のプレビュー"
            className="referenceImagePreview"
          />
          <button
            type="button"
            className="goalImageRemoveButton"
            onClick={() => {
              setReferenceImage(null);
              setReferenceImagePreview("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            画像を削除
          </button>
        </div>
      )}

      <div className="goalSelectionSummary">
        <span>現在の選択</span>
        <strong>{currentChoice}</strong>
      </div>

      {errorMessage && <p className="goalError" role="alert">{errorMessage}</p>}

      <button
        type="button"
        className="goalContinueButton"
        onClick={handleContinue}
      >
        この目標で次へ
        <span aria-hidden="true">→</span>
      </button>
      <p className="goalPrivacyNote">目標体型はあとからマイページで変更できます。</p>
    </FeatureCard>
  );
}
