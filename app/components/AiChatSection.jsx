import FeatureCard from "./FeatureCard";

export default function AiChatSection() {
  return (
    <FeatureCard number="06" title="AIチャット" description="トレーニングの悩みを相談する場所です。">
      {/* トップページからAIチャット専用ページへ移動する入口 */}
      <a className="chatOpenLink" href="/chat">
        AIチャットを開く
      </a>
    </FeatureCard>
  );
}
