import Link from "next/link";
import FeatureCard from "./FeatureCard";

export default function TrainingLogCard() {
  return (
    <FeatureCard
      number="03"
      title="トレーニング記録"
      description="種目・重量・回数・セットを記録する場所です。"
    >
      {/* トレーニング記録の専用ページへ移動する入口 */}
      <Link className="chatOpenLink" href="/training">
        トレーニングを記録する
      </Link>
    </FeatureCard>
  );
}
