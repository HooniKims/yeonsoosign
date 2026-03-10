import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "../lib/constants";

export default function LandingView({
  cloudEnabled,
  onOpenAdmin,
  onOpenCloud,
  onOpenSigner,
}) {
  const currentYear = new Date().getFullYear();

  return (
    <section className="hero-shell">
      <div className="hero-glow hero-glow-left" aria-hidden="true" />
      <div className="hero-glow hero-glow-right" aria-hidden="true" />
      <div className="landing-card">
        <span className="version-pill">{APP_VERSION}</span>
        <div className="landing-copy">
          <p className="eyebrow">연수 운영 서비스</p>
          <h1 className="landing-title">{APP_NAME}</h1>
          <p className="landing-subtitle">연수 생성, 서명, 출력까지 한 번에</p>

          <p className="landing-caption">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div className="landing-actions">
          <button className="action-button action-button-primary" onClick={onOpenSigner}>
            참여자 서명하기
          </button>
          <button className="action-button action-button-secondary" onClick={onOpenAdmin}>
            관리자 모드
          </button>
          <button className="action-button action-button-tertiary" onClick={onOpenCloud}>
            구글 계정 동기화 (다른 컴퓨터에서 불러오기)
          </button>
        </div>

        <div className="status-strip">
          <span className={`status-dot ${cloudEnabled ? "status-dot-live" : ""}`} />
          {cloudEnabled ? "구글 드라이브 동기화 중" : "로컬 저장소 사용 중"}
        </div>

        <p className="landing-footer">
          &copy; {currentYear} HooniKim. All rights reserved.
        </p>
      </div>
    </section>
  );
}
