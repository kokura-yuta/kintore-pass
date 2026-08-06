import MenuBuilderSection from "../components/MenuBuilderSection";

export default function MenuPage() {
  return (
    <main className="appFeaturePage">
      {/* AIメニュー作成だけを専用画面へ表示する場所 */}
      <MenuBuilderSection />
    </main>
  );
}
