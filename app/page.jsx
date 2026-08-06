import IdealBodySection from "./components/IdealBodySection";

export default function Home() {
  return (
    <main>
      {/* アプリ名とコンセプトを表示するトップ部分 */}
      <header className="hero">
        <p className="eyebrow">MY TRAINING COMPASS</p>
        <h1>MUSCLE PATH</h1>
        <p>理想の身体まで、今日やることを迷わない。</p>
      </header>

      {/* ホーム画面には選択中の理想の体機能だけを表示する場所 */}
      <div className="singleFeaturePage">
        <IdealBodySection />
      </div>
    </main>
  );
}
