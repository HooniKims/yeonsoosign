import { useMemo, useRef, useState } from "react";
import { downloadStaffTemplate, parseStaffFile } from "../lib/staff";

function SessionBadge({ type }) {
  return (
    <span className={`session-badge ${type === "office" ? "session-badge-office" : ""}`}>
      {type === "office" ? "외부" : "학교"}
    </span>
  );
}

function SessionCard({
  session,
  onDeleteSession,
  onOpenReport,
  onOpenShare,
  onUpdateStaff,
}) {
  return (
    <article className="session-card">
      <div className="session-card-copy">
        <h3>
          <SessionBadge type={session.type} />
          {session.title}
        </h3>
        <p>
          📅 {session.date} | 🏫 {session.schoolName} |{" "}
          <strong>✍️ {(session.signatures || []).length}명 서명</strong>
        </p>
      </div>

      <div className="session-card-actions">
        <button className="mini-button" onClick={() => onOpenShare(session)}>
          링크 공유
        </button>
        {session.type === "school" ? (
          <button className="mini-button mini-button-indigo" onClick={() => onUpdateStaff(session.id)}>
            명단 업데이트
          </button>
        ) : null}
        <button className="mini-button mini-button-blue" onClick={() => onOpenReport(session.id)}>
          결과 출력
        </button>
        <button className="mini-button mini-button-danger" onClick={() => onDeleteSession(session.id)}>
          삭제
        </button>
      </div>
    </article>
  );
}

export default function AdminView({
  busy,
  cloudEnabled,
  initialSchoolName,
  notify,
  onBack,
  onClearDefaultStaffList,
  onCreateSession,
  onDeleteSession,
  onOpenCloud,
  onOpenReport,
  onOpenShare,
  onRefresh,
  onReplaceSessionStaffList,
  onUpdateDefaultStaffList,
  sessions,
  staffList,
}) {
  const [form, setForm] = useState({
    type: "school",
    title: "",
    schoolName: initialSchoolName,
    date: "",
    time: "",
    useAuth: false,
    authCode: "",
  });
  const baseUploadRef = useRef(null);
  const updateUploadRef = useRef(null);
  const updateTargetIdRef = useRef(null);

  const sessionSummary = useMemo(() => `${staffList.length}명`, [staffList.length]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleDefaultUpload(file) {
    const list = await parseStaffFile(file);

    if (!list.length) {
      notify("유효한 교직원 명단을 읽지 못했습니다.", "error");
      return;
    }

    onUpdateDefaultStaffList(list);
  }

  async function handleSessionUpload(file, sessionId) {
    const list = await parseStaffFile(file);

    if (!list.length) {
      notify("유효한 교직원 명단을 읽지 못했습니다.", "error");
      return;
    }

    await onReplaceSessionStaffList(sessionId, list);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.schoolName.trim() || !form.date.trim()) {
      notify("필수 항목을 모두 입력해주세요.", "error");
      return;
    }

    if (form.type === "school" && staffList.length === 0) {
      notify("학교용 연수는 기본 교직원 명단이 필요합니다.", "error");
      return;
    }

    if (form.useAuth && !form.authCode.trim()) {
      notify("인증 비밀번호를 입력해주세요.", "error");
      return;
    }

    const success = await onCreateSession({
      authCode: form.useAuth ? form.authCode.trim() : "",
      date: form.date,
      schoolName: form.schoolName.trim(),
      time: form.time.trim(),
      title: form.title.trim(),
      type: form.type,
    });

    if (!success) {
      return;
    }

    setForm((current) => ({
      ...current,
      title: "",
      date: "",
      time: "",
      useAuth: false,
      authCode: "",
    }));
  }

  return (
    <section className="page-shell dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1>관리자 대시보드</h1>
        </div>
        <div className="dashboard-header-actions">
          <button className="mini-button mini-button-blue" onClick={onOpenCloud}>
            구글 연동 설정
          </button>
          <button className="ghost-button" onClick={onBack}>
            나가기
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {form.type === "school" ? (
          <section className="surface-card surface-card-accent">
            <div className="section-heading">
              <div>
                <h2>교직원 명단 관리 (학교용)</h2>
                <p className="muted-copy">
                  현재 등록된 교직원: <strong>{sessionSummary}</strong>
                </p>
                <p className="micro-copy">
                  외부공개연수(교육청/타학교) 생성 시에는 명단이 필요하지 않습니다.
                </p>
              </div>

              <div className="button-row">
                <button className="mini-button mini-button-danger" onClick={onClearDefaultStaffList}>
                  명단 초기화
                </button>
                <button className="mini-button mini-button-success" onClick={downloadStaffTemplate}>
                  양식 다운로드
                </button>
                <button className="mini-button" onClick={() => baseUploadRef.current?.click()}>
                  명단 업로드 (Excel)
                </button>
                <input
                  ref={baseUploadRef}
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden-input"
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    try {
                      await handleDefaultUpload(file);
                    } catch (error) {
                      notify(error.message || "파일 읽기 오류", "error");
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2>새 연수 등록</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="toggle-row">
              <label className={`toggle-card ${form.type === "school" ? "is-active" : ""}`}>
                <input
                  checked={form.type === "school"}
                  onChange={() => updateField("type", "school")}
                  type="radio"
                />
                🏫 학교용
              </label>
              <label className={`toggle-card ${form.type === "office" ? "is-active" : ""}`}>
                <input
                  checked={form.type === "office"}
                  onChange={() => updateField("type", "office")}
                  type="radio"
                />
                🏢 외부공개
              </label>
            </div>

            <div className="form-grid">
              <input
                className="text-input"
                placeholder="연수명"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
              <input
                className="text-input"
                placeholder="기관명"
                value={form.schoolName}
                onChange={(event) => updateField("schoolName", event.target.value)}
              />
              <input
                className="text-input"
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
              <input
                className="text-input"
                placeholder="시간 (예: 15:00~17:00)"
                value={form.time}
                onChange={(event) => updateField("time", event.target.value)}
              />
            </div>

            <label className="inline-check">
              <input
                checked={form.useAuth}
                onChange={(event) => updateField("useAuth", event.target.checked)}
                type="checkbox"
              />
              인증 비밀번호 설정
            </label>

            {form.useAuth ? (
              <input
                className="text-input"
                placeholder="비밀번호"
                value={form.authCode}
                onChange={(event) => updateField("authCode", event.target.value)}
              />
            ) : null}

            <button className="action-button action-button-primary action-button-full" disabled={busy}>
              연수 등록
            </button>
          </form>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2>등록된 연수 목록</h2>
            </div>
            <button className="mini-button mini-button-blue" onClick={onRefresh}>
              전체 새로고침
            </button>
          </div>

          <div className="session-list">
            {sessions.length ? (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  onDeleteSession={onDeleteSession}
                  onOpenReport={onOpenReport}
                  onOpenShare={onOpenShare}
                  onUpdateStaff={(sessionId) => {
                    updateTargetIdRef.current = sessionId;
                    updateUploadRef.current?.click();
                  }}
                  session={session}
                />
              ))
            ) : (
              <div className="empty-compact">
                <p>{cloudEnabled ? "클라우드 저장소" : "로컬 저장소"}에 등록된 연수가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <input
        ref={updateUploadRef}
        accept=".xlsx,.xls,.csv,.txt"
        className="hidden-input"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const targetId = updateTargetIdRef.current;

          if (!file || !targetId) {
            return;
          }

          try {
            await handleSessionUpload(file, targetId);
          } catch (error) {
            notify(error.message || "명단 업데이트 실패", "error");
          } finally {
            event.target.value = "";
            updateTargetIdRef.current = null;
          }
        }}
      />
    </section>
  );
}
