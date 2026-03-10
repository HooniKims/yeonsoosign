import { useState } from "react";
import { APPS_SCRIPT_SNIPPET } from "../lib/constants";
import { validateScriptUrl } from "../lib/sessions";

function buildErrorState(message) {
  return {
    status: "error",
    message,
  };
}

function buildValidatedUrl(scriptUrl) {
  try {
    return {
      ok: true,
      value: validateScriptUrl(scriptUrl),
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
    };
  }
}

export default function CloudSetupView({
  busy,
  currentConfig,
  googleClientId,
  onBack,
  onSave,
  onTest,
}) {
  const [scriptUrl, setScriptUrl] = useState(currentConfig.scriptUrl || "");
  const [clientId, setClientId] = useState(googleClientId || "");
  const [testState, setTestState] = useState({
    status: "idle",
    message: "",
  });

  async function handleTest() {
    const validation = buildValidatedUrl(scriptUrl);

    if (!validation.ok) {
      setTestState(buildErrorState(validation.message));
      return;
    }

    setTestState({
      status: "loading",
      message: "연동 상태를 확인하고 있습니다...",
    });

    try {
      const count = await onTest(validation.value);
      setTestState({
        status: "success",
        message: `연동 성공: 현재 ${count}개의 연수 데이터를 읽을 수 있습니다.`,
      });
    } catch (error) {
      setTestState(buildErrorState(error.message || "테스트에 실패했습니다."));
    }
  }

  async function handleSaveCloud() {
    const validation = buildValidatedUrl(scriptUrl);

    if (!validation.ok) {
      setTestState(buildErrorState(validation.message));
      return;
    }

    await onSave({
      enabled: true,
      scriptUrl: validation.value,
      googleClientId: clientId.trim(),
    });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setTestState({
      status: "success",
      message: "Apps Script 코드가 클립보드에 복사되었습니다.",
    });
  }

  return (
    <section className="page-shell cloud-shell">
      <div className="page-inner page-inner-wide">
        <div className="cloud-layout">
          <header className="page-header page-header-tight">
            <div>
              <p className="eyebrow">클라우드 연동</p>
              <h1>구글 드라이브 연동 설정</h1>
            </div>
            <button className="ghost-button" onClick={onBack} type="button">
              이전 화면
            </button>
          </header>

          <div className="cloud-notice-stack">
            <article className="notice-card notice-card-warm cloud-note-card">
              <h3>학교/기관 계정(Workspace) 사용 시 주의사항</h3>
              <p>
                학교 또는 교육청 계정은 보안상 외부 공개 배포를 막는 경우가 많습니다. 테스트가 실패하면{" "}
                <strong>개인 Gmail 계정</strong>으로 Apps Script를 배포하는 편이 안정적입니다.
                <br />
                (구글 연동을 통해 다른 PC에서도 연수 데이터를 그대로 불러올 수 있습니다.)
              </p>
            </article>

            <article className="notice-card notice-card-cool cloud-note-card">
              <h3>계정 넘기기 설정 (선택 사항)</h3>
              <p>
                다른 컴퓨터에서도 설정을 공유하려면 Google Client ID를 기록해 두세요. 현재 앱에서 OAuth
                로그인 자체를 사용하지는 않고 설정 보관용으로만 입력받습니다.
              </p>
              <input
                className="text-input mono-input"
                onChange={(event) => setClientId(event.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                value={clientId}
              />
            </article>
          </div>

          <div className="cloud-grid">
            <section className="surface-card cloud-step-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Apps Script 코드 업데이트</h2>
                </div>
                <button className="mini-button" onClick={copyCode} type="button">
                  코드 복사
                </button>
              </div>

              <ol className="plain-list plain-list-numbered">
                <li>
                  우측 상단의 <strong>[코드 복사]</strong> 버튼을 눌러 스크립트를 복사하세요.
                </li>
                <li>Google Apps Script의 새 프로젝트를 열고, 복사한 코드를 붙여넣습니다.</li>
                <li>
                  <strong>[배포] → [새 배포]</strong>를 클릭하고, 유형을{" "}
                  <strong>&quot;웹 앱(Web App)&quot;</strong>으로 선택합니다.
                </li>
                <li>
                  액세스 권한을 <strong>&quot;모든 사용자(Anyone)&quot;</strong>로 설정한 뒤 배포합니다.
                </li>
                <li>
                  생성된 <strong>웹 앱 URL</strong>을 복사하여 아래 Step 2에 입력하세요.
                </li>
              </ol>

              <pre className="code-panel">{APPS_SCRIPT_SNIPPET}</pre>
            </section>

            <section className="surface-card cloud-step-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>배포 URL 입력 및 테스트</h2>
                </div>
              </div>

              <div className="form-stack">
                <label className="field">
                  <span>Apps Script Web App URL</span>
                  <input
                    className="text-input mono-input"
                    onChange={(event) => setScriptUrl(event.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={scriptUrl}
                  />
                </label>

                <div className="button-row">
                  <button
                    className="action-button action-button-success"
                    disabled={busy}
                    onClick={handleTest}
                    type="button"
                  >
                    {testState.status === "loading" ? "확인 중..." : "연동 테스트 실행"}
                  </button>
                  <button
                    className="action-button action-button-secondary"
                    disabled={busy}
                    onClick={() =>
                      onSave({
                        enabled: false,
                        scriptUrl: "",
                        googleClientId: clientId.trim(),
                      })
                    }
                    type="button"
                  >
                    로컬 모드로 전환
                  </button>
                </div>

                {testState.message ? (
                  <p className={`inline-feedback inline-feedback-${testState.status}`}>
                    {testState.message}
                  </p>
                ) : null}

                <div className="config-summary">
                  <p>설정 저장 후에는 관리자 화면에서 동일한 CRUD가 클라우드로 전환됩니다.</p>
                  <p>
                    현재 상태: {currentConfig.enabled ? "클라우드 사용 중" : "로컬 저장소 사용 중"}
                  </p>
                </div>

                <div className="button-row button-row-end">
                  <button className="ghost-button" onClick={onBack} type="button">
                    취소
                  </button>
                  <button
                    className="action-button action-button-primary"
                    disabled={!scriptUrl.trim() || busy}
                    onClick={handleSaveCloud}
                    type="button"
                  >
                    저장 및 완료
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
