// 機能番号・見出し・説明・中身を共通デザインで囲むカード
export default function FeatureCard({ number, title, description, children }) {
  return (
    <section className="featureCard">
      <p className="featureNumber">{number}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="featureContent">{children}</div>
    </section>
  );
}
