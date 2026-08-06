"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "理想", icon: "◇" },
  { href: "/analysis", label: "分析", icon: "◉" },
  { href: "/training", label: "記録", icon: "▤" },
  { href: "/menu", label: "メニュー", icon: "▦" },
  { href: "/dashboard", label: "進捗", icon: "↗" },
  { href: "/chat", label: "AI", icon: "✦" },
];

export default function BottomNavigation() {
  // 現在のURLを使って選択中の下部メニューを判定する場所
  const pathname = usePathname();

  return (
    <nav className="bottomNavigation" aria-label="主要機能">
      <div className="bottomNavigationInner">
        {/* 6つの主要機能を横並びのリンクとして表示する場所 */}
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              className={`bottomNavigationLink${
                isActive ? " active" : ""
              }`}
              href={item.href}
              key={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bottomNavigationIcon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
