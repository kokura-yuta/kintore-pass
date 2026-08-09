import ProfileSetupForm from "../components/ProfileSetupForm";

export default function ProfileSetupPage() {
  return (
    <main className="appFeaturePage onboardingPage">
      <header className="onboardingHeader">
        <div>
          <p className="eyebrow">FIRST SETUP</p>
          <h1 className="profileSetupTitle">身体情報</h1>
        </div>
        <p className="onboardingStep">STEP 2</p>
      </header>
      <p className="profileSetupLead">
        あなたに合ったメニューを作るための基本情報を入力してください。
      </p>
      <ProfileSetupForm />
    </main>
  );
}
