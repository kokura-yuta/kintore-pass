"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const ONBOARDING_COMPLETED_KEY = "kintore-pas:onboarding-completed";

export default function InitialRouteGuard() {
  const router = useRouter();

  useEffect(() => {
    let nextPath = "/ideal-body";

    try {
      const hasCompletedOnboarding =
        window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";

      if (hasCompletedOnboarding) {
        // 新ホーム画面の実装後は、移動先を /home に変更する。
        nextPath = "/dashboard";
      }
    } catch {
      // 保存情報を読めない場合は、安全のため初回設定から開始する。
    }

    router.replace(nextPath);
  }, [router]);

  return (
    <main className="routeCheckScreen" aria-live="polite" aria-busy="true">
      <div className="routeCheckSpinner" aria-hidden="true" />
      <p>ユーザー情報を確認しています…</p>
    </main>
  );
}
