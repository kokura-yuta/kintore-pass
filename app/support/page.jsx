import Link from "next/link";

export const metadata = { title: "サポート | 筋トレPAS" };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

const faqs = [
  {
    title: "ログイン・認証コードについて",
    body: "認証コードが届かない場合は、メールアドレス、迷惑メールフォルダ、受信拒否設定をご確認ください。時間を空けて再送しても届かない場合は、下記の問い合わせ先へご連絡ください。",
  },
  {
    title: "記録やAI機能でエラーが出た場合",
    body: "通信環境を確認してから、画面の「もう一度試す」を押してください。改善しない場合は、発生した画面名、日時、表示されたメッセージを添えてお問い合わせください。身体写真やパスワードは送らないでください。",
  },
  {
    title: "プレミアムプランについて",
    body: "プレミアムは月額1,000円の自動更新プランです。食事管理と月4回までの身体分析を利用できます。初回設定時の身体分析1回は無料です。",
  },
  {
    title: "購入の復元・解約について",
    body: "同じApple Accountで購入済みの場合は、アプリのプラン画面から購入を復元できます。解約はiPhoneの「設定」からApple Accountのサブスクリプション管理を開いて行います。アプリを削除しただけでは解約されません。",
  },
  {
    title: "アカウントとデータを削除したい",
    body: "アプリのマイページにある「アカウントと全データの削除」から手続きできます。誤操作を防ぐため、削除前に確認操作があります。",
  },
];

export default function SupportPage() {
  return (
    <main className="supportPage">
      <header className="supportHero">
        <p className="supportEyebrow">MUSCLE PAS SUPPORT</p>
        <h1>サポート</h1>
        <p>筋トレPASの使い方や、困ったときの確認方法をご案内します。</p>
      </header>

      <section className="supportSection" aria-labelledby="support-contact-title">
        <p className="supportSectionNumber">01</p>
        <h2 id="support-contact-title">お問い合わせ</h2>
        {supportEmail ? (
          <>
            <p>以下のメールアドレスへご連絡ください。通常は内容を確認後、順次返信します。</p>
            <a className="supportContactButton" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </>
        ) : (
          <div className="supportPending">
            問い合わせ先は現在準備中です。正式なメールアドレスは、アプリ公開前にこちらへ掲載します。
          </div>
        )}
        <p className="supportCaution">パスワード、認証コード、身体写真などの機密情報はメールへ記載しないでください。</p>
      </section>

      <section className="supportSection" aria-labelledby="support-faq-title">
        <p className="supportSectionNumber">02</p>
        <h2 id="support-faq-title">よくある質問</h2>
        <div className="supportFaqList">
          {faqs.map((faq) => (
            <article className="supportFaq" key={faq.title}>
              <h3>{faq.title}</h3>
              <p>{faq.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="supportLinks">
        <Link href="/privacy">プライバシーポリシー</Link>
        <Link href="/terms">利用規約</Link>
      </footer>
    </main>
  );
}
