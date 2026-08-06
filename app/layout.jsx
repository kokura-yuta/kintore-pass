import "./globals.css";
import BottomNavigation from "./components/BottomNavigation";

export const metadata = {
  title: "MUSCLE PATH",
  description: "理想の身体までの道筋を、自分の力で記録する筋トレアプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        {children}
        {/* すべての機能画面で共通して使う固定下部メニュー */}
        <BottomNavigation />
      </body>
    </html>
  );
}
