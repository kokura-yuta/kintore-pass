"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DISPLAY_TIME_MS = 1800;

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      // 次に実装する初回判定画面へ、ここから進む。
      router.replace("/dashboard");
    }, DISPLAY_TIME_MS);

    return () => window.clearTimeout(timerId);
  }, [router]);

  return (
    <main className="splashScreen" aria-label="筋トレPAS 起動画面">
      <div className="splashGlow" aria-hidden="true" />
      <div className="splashContent">
        <p className="splashTagline">PERSONAL AI TRAINING COACH</p>
        <h1 className="splashLogo">
          筋トレ<span>PAS</span>
        </h1>
        <p className="splashMessage">理想まで、迷わない。</p>
      </div>
      <div className="splashLoader" aria-label="読み込み中">
        <span />
      </div>
    </main>
  );
}
