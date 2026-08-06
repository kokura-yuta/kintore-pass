"use client";

import { useState } from "react";
import FeatureCard from "./FeatureCard";

// 画面に表示する4種類の体型情報をまとめた固定データ
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
  // 選択中の体型と、利用者が選んだ参考画像を管理する場所
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState("");

  // 選択した体型を画面の状態とブラウザ内の共通データへ保存する場所
 function handleBodyTypeSelect(bodyTypeName) {
  setSelectedBodyType(bodyTypeName);
  localStorage.setItem("goalBodyType", bodyTypeName);
}

  // 選択された画像を保存し、ブラウザ表示用のデータへ変換する処理
  function handleReferenceImageChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;
    setReferenceImage(selectedFile);

    if (!selectedFile) {
      setReferenceImagePreview("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setReferenceImagePreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  }
  return (
    <FeatureCard number="01" title="理想の体" description="目標にする体型を決める場所です。">
      {/* 体型データを画像付きの選択カードとして表示する場所 */}
      <div className="bodyTypeButtons">
        {bodyTypes.map((bodyType) => (
        <button
          key={bodyType.name}
          type="button"
          className={
            selectedBodyType === bodyType.name
              ? "bodyTypeButton selected"
              : "bodyTypeButton"
          }
          onClick={() => handleBodyTypeSelect(bodyType.name)}
        >
          <img
          src={bodyType.image}
          alt={`${bodyType.name}の見本`}
          className="bodyTypeImage"
        />

        <span className="bodyTypeName">
          {bodyType.name}
        </span>

        <span className="bodyTypeDescription">
          {bodyType.description}
        </span>
        </button>
        ))}
      </div>
      <p>選択中：{selectedBodyType}</p>

      {/* 利用者自身の参考画像を選択・プレビューする場所 */}
      <div>
        <label htmlFor="referenceImage">
          参考画像を選ぶ
        </label>

        <input
          id="referenceImage"
          type="file"
          accept="image/*"
          onChange={handleReferenceImageChange}
        />

        {referenceImage && (
          <p>選択した画像:{referenceImage.name}</p>
        )}
        {referenceImagePreview && (
          <img
            src={referenceImagePreview}
            alt="選択した参考画像のプレビュー"
            className="referenceImagePreview"
          />
        )}
      </div>
    </FeatureCard>
  );
}
