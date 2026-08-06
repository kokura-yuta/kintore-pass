import TrainingLogSection from "../components/TrainingLogSection";

export default function TrainingPage() {
  return (
    <main className="chatPage">
      {/* トレーニング記録画面の見出し */}
      <header className="chatPageHeader">
        <p className="eyebrow">TRAINING LOG</p>
        <h1>トレーニング記録</h1>
        <p>今日取り組んだ部位と種目を選んで記録します。</p>
      </header>

      {/* 今まで作ったトレーニング記録フォームを表示する場所 */}
      <TrainingLogSection />
    </main>
  );
}
