import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "../lib/constants";

export default function LandingView({
  cloudEnabled,
  currentSchoolName,
  currentUserLabel,
  isSignedIn,
  onOpenAdmin,
  onOpenCloud,
  onOpenSigner,
  onSignOut,
}) {
  const currentYear = new Date().getFullYear();
  const statusLabel = isSignedIn
    ? cloudEnabled
      ? `${currentSchoolName || "학교"} 설정 완료`
      : "학교 GAS 주소 설정 필요"
    : "관리자 로그인 후 학교 설정 가능";

  return (
    <section className="hero-shell">
      <div className="hero-glow hero-glow-left" aria-hidden="true" />
      <div className="hero-glow hero-glow-right" aria-hidden="true" />
      <div className="landing-card">
        <span className="version-pill">{APP_VERSION}</span>

        <div className="landing-copy">
          <p className="eyebrow">Training Register</p>
          <h1 className="landing-title">{APP_NAME}</h1>
          <p className="landing-subtitle">연수 생성, 서명, 출력까지 한 번에</p>
          <p className="landing-caption">{APP_DESCRIPTION}</p>
        </div>

        {isSignedIn ? (
          <div className="identity-card">
            <strong>{currentUserLabel}</strong>
            <span>{currentSchoolName || "학교 미선택"}</span>
          </div>
        ) : null}

        <div className="landing-actions">
          <button className="action-button action-button-primary" onClick={onOpenSigner}>
            참여자 서명하기
          </button>
          <button className="action-button action-button-secondary" onClick={onOpenAdmin}>
            {isSignedIn ? "관리자 대시보드" : "관리자 로그인 / 가입"}
          </button>
          <button className="action-button action-button-tertiary" onClick={onOpenCloud}>
            학교 설정 보기
          </button>
          {isSignedIn ? (
            <button className="ghost-button landing-inline-action" onClick={onSignOut} type="button">
              로그아웃
            </button>
          ) : null}
        </div>

        <div className="status-strip">
          <span className={`status-dot ${cloudEnabled ? "status-dot-live" : ""}`} />
          {statusLabel}
        </div>

        <p className="landing-footer">&copy; {currentYear} HooniKim. All rights reserved.</p>
      </div>
    </section>
  );
}
