import Link from "next/link";

export default function LegalPage({ title, sections }) {
  return (
    <main className="legalPage">
      <p className="legalEyebrow">MUSCLE PAS LEGAL</p>
      <h1>{title}</h1>
      <p className="legalUpdated">制定日・最終更新日：2026年9月17日</p>
      <aside className="legalNotice">お問い合わせ：kintore505@gmail.com。運営者の公開名はApp Store提出前に更新します。</aside>
      {sections.map((section) => (
        <section className="legalSection" key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      <div className="legalLinks"><Link href="/support">サポート</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/terms">利用規約</Link></div>
    </main>
  );
}
