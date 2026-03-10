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
      message: "\uC5F0\uB3D9 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...",
    });

    try {
      const count = await onTest(validation.value);
      setTestState({
        status: "success",
        message: `\uC5F0\uB3D9 \uC131\uACF5: \uD604\uC7AC ${count}\uAC1C\uC758 \uC138\uC158 \uB370\uC774\uD130\uB97C \uC77D\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`,
      });
    } catch (error) {
      setTestState(buildErrorState(error.message || "\uD14C\uC2A4\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
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
      message: "Apps Script \uCF54\uB4DC\uAC00 \uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
    });
  }

  return (
    <section className="page-shell cloud-shell">
      <div className="page-inner page-inner-wide">
        <header className="page-header page-header-tight">
          <div>
            <p className="eyebrow">클라우드 연동</p>
            <h1>\uAD6C\uAE00 \uB4DC\uB77C\uC774\uBE0C \uC5F0\uB3D9 \uC124\uC815</h1>
          </div>
          <button className="ghost-button" onClick={onBack}>
            \uAD00\uB9AC\uC790 \uD654\uBA74\uC73C\uB85C
          </button>
        </header>

        <article className="notice-card notice-card-warm">
          <h3>\uD559\uAD50/\uAE30\uAD00 \uACC4\uC815(Workspace) \uC0AC\uC6A9 \uC2DC \uC8FC\uC758\uC0AC\uD56D</h3>
          <p>
            \uD559\uAD50 \uB610\uB294 \uAD50\uC721\uCCAD \uACC4\uC815\uC740 \uC678\uBD80 \uACF5\uAC1C \uBC30\uD3EC\uB97C \uB9C9\uB294
            \uACBD\uC6B0\uAC00 \uB9CE\uC2B5\uB2C8\uB2E4. \uD14C\uC2A4\uD2B8\uAC00 \uC2E4\uD328\uD558\uBA74 \uAC1C\uC778 Gmail
            \uACC4\uC815\uC73C\uB85C Apps Script\uB97C \uBC30\uD3EC\uD558\uB294 \uD3B8\uC774 \uC548\uC815\uC801\uC785\uB2C8\uB2E4.
          </p>
        </article>

        <article className="notice-card notice-card-cool">
          <h3>\uACC4\uC815 \uB118\uAE30\uAE30 \uC124\uC815 (\uC120\uD0DD \uC0AC\uD56D)</h3>
          <p>
            \uB2E4\uB978 \uCEF4\uD4E8\uD130\uC5D0\uC11C\uB3C4 \uC124\uC815\uC744 \uACF5\uC720\uD558\uB824\uBA74 Google Client ID\uB97C
            \uAE30\uB85D\uD574 \uB450\uC138\uC694. \uD604\uC7AC \uC571\uC5D0\uC11C OAuth \uB85C\uADF8\uC778 \uC790\uCCB4\uB97C
            \uC0AC\uC6A9\uD558\uC9C0\uB294 \uC54A\uACE0 \uC124\uC815 \uBCF4\uAD00\uC6A9\uC73C\uB85C\uB9CC \uC785\uB825\uBC1B\uC2B5\uB2C8\uB2E4.
          </p>
          <input
            className="text-input mono-input"
            placeholder="123456789-abc.apps.googleusercontent.com"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
        </article>

        <div className="cloud-grid">
          <section className="surface-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Step 1</p>
                <h2>Apps Script \uCF54\uB4DC \uC5C5\uB370\uC774\uD2B8</h2>
              </div>
              <button className="mini-button" onClick={copyCode}>
                \uCF54\uB4DC \uBCF5\uC0AC
              </button>
            </div>

            <ol className="plain-list plain-list-numbered">
              <li>\uAE30\uC874 Apps Script \uD504\uB85C\uC81D\uD2B8\uB97C \uC5FD\uB2C8\uB2E4.</li>
              <li>\uAE30\uC874 \uCF54\uB4DC\uB97C \uC9C0\uC6B0\uACE0 \uC544\uB798 \uCF54\uB4DC\uB97C \uBD99\uC5EC\uB123\uC2B5\uB2C8\uB2E4.</li>
              <li>\uC0C8 \uBC30\uD3EC\uB85C Web App \uC2E4\uD589 URL\uC744 \uBCF5\uC0AC\uD569\uB2C8\uB2E4.</li>
            </ol>

            <pre className="code-panel">{APPS_SCRIPT_SNIPPET}</pre>
          </section>

          <section className="surface-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>\uBC30\uD3EC URL \uC785\uB825 \uBC0F \uD14C\uC2A4\uD2B8</h2>
              </div>
            </div>

            <div className="form-stack">
              <label className="field">
                <span>Apps Script Web App URL</span>
                <input
                  className="text-input mono-input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={scriptUrl}
                  onChange={(event) => setScriptUrl(event.target.value)}
                />
              </label>

              <div className="button-row">
                <button
                  className="action-button action-button-success"
                  disabled={busy}
                  onClick={handleTest}
                >
                  {testState.status === "loading"
                    ? "\uC811\uC18D \uC911..."
                    : "\uC5F0\uB3D9 \uD14C\uC2A4\uD2B8 \uC2E4\uD589"}
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
                >
                  \uB85C\uCEEC \uBAA8\uB4DC\uB85C \uC804\uD658
                </button>
              </div>

              {testState.message ? (
                <p className={`inline-feedback inline-feedback-${testState.status}`}>
                  {testState.message}
                </p>
              ) : null}

              <div className="config-summary">
                <p>
                  \uC124\uC815 \uC800\uC7A5 \uD6C4\uC5D0\uB294 \uAD00\uB9AC\uC790 \uD654\uBA74\uC5D0\uC11C \uB3D9\uC77C\uD55C CRUD\uAC00
                  \uD074\uB77C\uC6B0\uB4DC\uB85C \uC804\uD658\uB429\uB2C8\uB2E4.
                </p>
                <p>
                  \uD604\uC7AC \uC0C1\uD0DC:{" "}
                  {currentConfig.enabled
                    ? "\uD074\uB77C\uC6B0\uB4DC \uC0AC\uC6A9 \uC911"
                    : "\uB85C\uCEEC \uC800\uC7A5\uC18C \uC0AC\uC6A9 \uC911"}
                </p>
              </div>

              <div className="button-row button-row-end">
                <button className="ghost-button" onClick={onBack}>
                  \uCDE8\uC18C
                </button>
                <button
                  className="action-button action-button-primary"
                  disabled={!scriptUrl.trim() || busy}
                  onClick={handleSaveCloud}
                >
                  \uC800\uC7A5 \uBC0F \uC644\uB8CC
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
