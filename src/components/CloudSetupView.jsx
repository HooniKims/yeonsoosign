import { useEffect, useState } from "react";
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
  adminEmail,
  busy,
  currentConfig,
  onBack,
  onSave,
  onTest,
  schoolName,
}) {
  const [scriptUrl, setScriptUrl] = useState(currentConfig.scriptUrl || "");
  const [testState, setTestState] = useState({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    setScriptUrl(currentConfig.scriptUrl || "");
  }, [currentConfig.scriptUrl]);

  async function handleTest() {
    const validation = buildValidatedUrl(scriptUrl);

    if (!validation.ok) {
      setTestState(buildErrorState(validation.message));
      return;
    }

    setTestState({
      status: "loading",
      message: "연결 상태를 확인하고 있습니다...",
    });

    try {
      const count = await onTest(validation.value);
      setTestState({
        status: "success",
        message: `연결 성공: 현재 ${count}개의 연수 데이터를 읽을 수 있습니다.`,
      });
    } catch (error) {
      setTestState(buildErrorState(error.message || "연결 테스트에 실패했습니다."));
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
    });
  }

  async function handleCopyCode() {
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
              <p className="eyebrow">School Setup</p>
              <h1>학교 Apps Script 연결 설정</h1>
              <p className="muted-copy">
                {schoolName || "학교"} 관리자 계정
                {adminEmail ? ` · ${adminEmail}` : ""}
              </p>
            </div>
            <button className="ghost-button" onClick={onBack} type="button">
              이전 화면
            </button>
          </header>

          <div className="cloud-notice-stack">
            <article className="notice-card notice-card-warm cloud-note-card">
              <h3>설정 방식</h3>
              <p>
                학교별 Google Apps Script Web App URL을 한 번 등록하면 같은 학교의 관리자들은 어느
                브라우저에서 로그인해도 같은 연수 데이터를 조회할 수 있습니다.
              </p>
            </article>

            <article className="notice-card notice-card-cool cloud-note-card">
              <h3>권장 흐름</h3>
              <p>
                1. 아래 코드로 Apps Script를 배포합니다.
                <br />
                2. 발급된 Web App URL을 저장합니다.
                <br />
                3. 저장 후 테스트에 성공하면 관리자 화면에서 기존 연수 목록을 계속 조회할 수 있습니다.
              </p>
            </article>
          </div>

          <div className="cloud-grid">
            <section className="surface-card cloud-step-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Apps Script 코드 복사</h2>
                </div>
                <button className="mini-button" onClick={handleCopyCode} type="button">
                  코드 복사
                </button>
              </div>

              <ol className="plain-list plain-list-numbered">
                <li>Google Apps Script에서 새 프로젝트를 만듭니다.</li>
                <li>기존 코드를 지우고 아래 코드를 붙여 넣습니다.</li>
                <li>배포 &gt; 새 배포 &gt; 웹 앱으로 배포를 선택합니다.</li>
                <li>접근 권한은 서명 참여자가 접속할 수 있도록 공개 범위로 설정합니다.</li>
                <li>생성된 Web App URL을 복사해 아래 입력칸에 붙여 넣습니다.</li>
              </ol>

              <pre className="code-panel">{APPS_SCRIPT_SNIPPET}</pre>
            </section>

            <section className="surface-card cloud-step-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>학교 URL 등록 및 연결 테스트</h2>
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
                    {testState.status === "loading" ? "확인 중..." : "연결 테스트"}
                  </button>
                  <button
                    className="action-button action-button-secondary"
                    disabled={busy}
                    onClick={() =>
                      onSave({
                        enabled: false,
                        scriptUrl: "",
                      })
                    }
                    type="button"
                  >
                    학교 설정 해제
                  </button>
                </div>

                {testState.message ? (
                  <p className={`inline-feedback inline-feedback-${testState.status}`}>
                    {testState.message}
                  </p>
                ) : null}

                <div className="config-summary">
                  <p>현재 학교: {schoolName || "미지정"}</p>
                  <p>현재 상태: {currentConfig.enabled ? "GAS 연결 사용 중" : "GAS 주소 미설정"}</p>
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
                    학교 설정 저장
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
