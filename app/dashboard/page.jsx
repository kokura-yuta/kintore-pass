import DashboardSection from "../components/DashboardSection";

export default function DashboardPage() {
  return (
    <main className="appFeaturePage">
      {/* ダッシュボードだけを専用画面へ表示する場所 */}
      <DashboardSection />
    </main>
  );
}
