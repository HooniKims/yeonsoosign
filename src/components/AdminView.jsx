import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { Building, Building2, Calendar, PenLine, RefreshCw, Settings, UserRound } from "lucide-react";
import { buildStaffTemplateBlob, parseStaffFile, STAFF_TEMPLATE_FILE_NAME } from "../lib/staff";

function buildSessionDraft(session) {
  return {
    title: session.title || "",
    schoolName: session.schoolName || "",
    date: session.date || "",
    time: session.time || "",
    useAuth: Boolean(session.authCode),
    authCode: session.authCode || "",
  };
}

function SessionBadge({ type }) {
  return (
    <span className={`session-badge ${type === "office" ? "session-badge-office" : ""}`}>
      {type === "office" ? "기관" : "학교"}
    </span>
  );
}

function SessionCard({
  busy,
  notify,
  onDeleteSession,
  onOpenReport,
  onOpenShare,
  onUpdateSession,
  onUpdateStaff,
  session,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildSessionDraft(session));

  useEffect(() => {
    setDraft(buildSessionDraft(session));
    setIsEditing(false);
  }, [session]);

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCancelEdit() {
    setDraft(buildSessionDraft(session));
    setIsEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.schoolName.trim() || !draft.date.trim()) {
      notify("연수명, 기관명, 날짜를 모두 입력해 주세요.", "error");
      return;
    }

    if (draft.useAuth && !draft.authCode.trim()) {
      notify("인증 비밀번호를 입력해 주세요.", "error");
      return;
    }

    const success = await onUpdateSession(session.id, {
      authCode: draft.useAuth ? draft.authCode.trim() : "",
      date: draft.date,
      schoolName: draft.schoolName.trim(),
      time: draft.time.trim(),
      title: draft.title.trim(),
    });

    if (success) {
      setIsEditing(false);
    }
  }

  return (
    <article className={`session-card ${isEditing ? "session-card-editing" : ""}`}>
      {isEditing ? (
        <form className="session-edit-form form-stack" onSubmit={handleSave}>
          <div className="session-card-copy">
            <h3>
              <SessionBadge type={session.type} />
              연수 정보 수정
            </h3>
            <p className="session-card-meta">
              <span className="session-card-meta-item">
                <Calendar size={14} /> 기존 일정 {session.date}
              </span>
              <span className="session-card-divider">|</span>
              <span className="session-card-meta-item">
                <Building size={14} /> 기존 기관 {session.schoolName}
              </span>
            </p>
          </div>

          <div className="form-grid session-edit-grid">
            <input
              className="text-input"
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="연수명"
              value={draft.title}
            />
            <input
              className="text-input"
              onChange={(event) => updateDraft("schoolName", event.target.value)}
              placeholder="기관명"
              value={draft.schoolName}
            />
            <input
              className="text-input"
              onChange={(event) => updateDraft("date", event.target.value)}
              type="date"
              value={draft.date}
            />
            <input
              className="text-input"
              onChange={(event) => updateDraft("time", event.target.value)}
              placeholder="시간 (예: 15:00~17:00)"
              value={draft.time}
            />
          </div>

          <label className="inline-check">
            <input
              checked={draft.useAuth}
              onChange={(event) => updateDraft("useAuth", event.target.checked)}
              type="checkbox"
            />
            인증 비밀번호 설정
          </label>

          {draft.useAuth ? (
            <input
              className="text-input"
              onChange={(event) => updateDraft("authCode", event.target.value)}
              placeholder="비밀번호"
              value={draft.authCode}
            />
          ) : null}

          <div className="session-edit-actions">
            <button className="ghost-button" disabled={busy} onClick={handleCancelEdit} type="button">
              취소
            </button>
            <button className="mini-button mini-button-blue" disabled={busy} type="submit">
              수정 저장
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="session-card-copy">
            <h3>
              <SessionBadge type={session.type} />
              {session.title}
            </h3>
            <p className="session-card-meta">
              <span className="session-card-meta-item">
                <Calendar size={14} /> {session.date}
              </span>
              {session.time ? (
                <>
                  <span className="session-card-divider">|</span>
                  <span className="session-card-meta-item">{session.time}</span>
                </>
              ) : null}
              <span className="session-card-divider">|</span>
              <span className="session-card-meta-item">
                <Building size={14} /> {session.schoolName}
              </span>
              <span className="session-card-divider">|</span>
              <strong className="session-card-meta-item session-card-meta-strong">
                <PenLine size={14} /> {(session.staffList || []).length}명 중 {(session.signatures || []).length}명 서명
              </strong>
            </p>
          </div>

          <div className="session-card-actions">
            <button className="mini-button mini-button-blue" disabled={busy} onClick={() => setIsEditing(true)}>
              정보 수정
            </button>
            <button className="mini-button" disabled={busy} onClick={() => onOpenShare(session)}>
              링크 공유
            </button>
            {session.type === "school" ? (
              <button className="mini-button mini-button-indigo" disabled={busy} onClick={() => onUpdateStaff(session.id)}>
                명단 업데이트
              </button>
            ) : null}
            <button className="mini-button mini-button-blue" disabled={busy} onClick={() => onOpenReport(session.id)}>
              결과 출력
            </button>
            <button className="mini-button mini-button-danger" disabled={busy} onClick={() => onDeleteSession(session.id)}>
              삭제
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export default function AdminView({
  accountBusy,
  adminEmail,
  adminName,
  busy,
  canChangePassword,
  cloudEnabled,
  initialSchoolName,
  notify,
  onBack,
  onChangePassword,
  onClearDefaultStaffList,
  onCreateSession,
  onDeleteOwnAccount,
  onDeleteSession,
  onOpenCloud,
  onOpenReport,
  onOpenShare,
  onRefresh,
  onReplaceSessionStaffList,
  onSignOut,
  onUpdateSession,
  onUpdateDefaultStaffList,
  schoolName,
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const baseUploadRef = useRef(null);
  const updateUploadRef = useRef(null);
  const updateTargetIdRef = useRef(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      schoolName: current.schoolName || initialSchoolName,
    }));
  }, [initialSchoolName]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const sessionSummary = useMemo(() => `${staffList.length}명 등록`, [staffList.length]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({
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

    await onUpdateDefaultStaffList(list);
  }

  async function handleSessionUpload(file, sessionId) {
    const list = await parseStaffFile(file);

    if (!list.length) {
      notify("유효한 교직원 명단을 읽지 못했습니다.", "error");
      return;
    }

    await onReplaceSessionStaffList(sessionId, list);
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.nextPassword || !passwordForm.confirmPassword) {
      notify("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.", "error");
      return;
    }

    if (passwordForm.nextPassword.length < 6) {
      notify("새 비밀번호는 6자 이상이어야 합니다.", "error");
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      notify("새 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    const success = await onChangePassword({
      currentPassword: passwordForm.currentPassword,
      nextPassword: passwordForm.nextPassword,
    });

    if (!success) {
      return;
    }

    setPasswordForm({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
    setIsAccountMenuOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.schoolName.trim() || !form.date.trim()) {
      notify("필수 항목을 모두 입력해 주세요.", "error");
      return;
    }

    if (form.type === "school" && staffList.length === 0) {
      notify("학교형 연수에는 기본 교직원 명단이 필요합니다.", "error");
      return;
    }

    if (form.useAuth && !form.authCode.trim()) {
      notify("인증 비밀번호를 입력해 주세요.", "error");
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
          <p className="eyebrow">Admin Dashboard</p>
          <h1>{schoolName || "학교"} 관리자 화면</h1>
          <p className="muted-copy">
            {adminName || "관리자"}
            {adminEmail ? ` · ${adminEmail}` : ""}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button className="mini-button mini-button-blue" onClick={onRefresh} type="button">
            <RefreshCw size={15} /> 새로고침
          </button>
          <div className={`account-menu-shell ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
            <button
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="dialog"
              aria-label="내 계정 메뉴"
              className="account-menu-trigger"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              type="button"
            >
              <UserRound size={18} strokeWidth={2} />
            </button>

            {isAccountMenuOpen ? (
              <div aria-label="내 계정 메뉴" className="account-popover" role="dialog">
                <div className="account-popover-header">
                  <div>
                    <p className="eyebrow">My Account</p>
                    <h2>내 계정</h2>
                  </div>
                  <p className="micro-copy">비밀번호 변경과 탈퇴를 여기서 처리합니다.</p>
                </div>

                <div className="account-summary-card">
                  <strong>{adminName || "관리자"}</strong>
                  <p>{adminEmail || "이메일 정보 없음"}</p>
                  <p className="micro-copy">{schoolName || "학교 미지정"}</p>
                </div>

                {canChangePassword ? (
                  <form className="form-stack account-form-card" onSubmit={handlePasswordSubmit}>
                    <div>
                      <h3 className="account-card-title">비밀번호 변경</h3>
                      <p className="micro-copy">현재 비밀번호를 다시 확인한 뒤 새 비밀번호로 변경합니다.</p>
                    </div>

                    <input
                      autoComplete="current-password"
                      className="text-input"
                      onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                      placeholder="현재 비밀번호"
                      type="password"
                      value={passwordForm.currentPassword}
                    />
                    <input
                      autoComplete="new-password"
                      className="text-input"
                      onChange={(event) => updatePasswordField("nextPassword", event.target.value)}
                      placeholder="새 비밀번호"
                      type="password"
                      value={passwordForm.nextPassword}
                    />
                    <input
                      autoComplete="new-password"
                      className="text-input"
                      onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
                      placeholder="새 비밀번호 확인"
                      type="password"
                      value={passwordForm.confirmPassword}
                    />

                    <div className="button-row button-row-end">
                      <button className="mini-button mini-button-blue" disabled={accountBusy} type="submit">
                        비밀번호 변경
                      </button>
                    </div>
                  </form>
                ) : (
                  <article className="notice-card notice-card-cool account-form-card">
                    <h3 className="account-card-title">비밀번호 변경 불가</h3>
                    <p>Google 로그인 전용 계정은 비밀번호 변경 대상이 아닙니다.</p>
                  </article>
                )}

                <div className="account-danger-card">
                  <div>
                    <h3 className="account-card-title">계정 탈퇴</h3>
                    <p className="micro-copy">탈퇴 시 Firebase 인증 계정과 관리자 문서가 함께 삭제됩니다.</p>
                  </div>

                  <div className="button-row button-row-end">
                    <button className="mini-button mini-button-danger" disabled={accountBusy} onClick={onDeleteOwnAccount} type="button">
                      내 계정 탈퇴
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <button className="mini-button" onClick={onOpenCloud} type="button">
            <Settings size={15} /> 학교 설정
          </button>
          <button className="ghost-button" onClick={onSignOut} type="button">
            로그아웃
          </button>
          <button className="ghost-button" onClick={onBack} type="button">
            닫기
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {form.type === "school" ? (
          <section className="surface-card surface-card-accent">
            <div className="section-heading">
              <div>
                <h2>기본 교직원 명단 캐시</h2>
                <p className="muted-copy">
                  현재 등록된 기본 명단 <strong>{sessionSummary}</strong>
                </p>
                <p className="micro-copy">
                  이 명단은 새 학교형 연수를 만들 때만 복사됩니다. 기존 연수 목록은 그대로 유지됩니다.
                </p>
              </div>

              <div className="button-row">
                <button className="mini-button mini-button-danger" onClick={onClearDefaultStaffList} type="button">
                  명단 초기화
                </button>
                <button
                  className="mini-button mini-button-success"
                  onClick={async () => {
                    try {
                      const blob = await buildStaffTemplateBlob();
                      saveAs(blob, STAFF_TEMPLATE_FILE_NAME);
                    } catch (error) {
                      notify("서식 다운로드에 실패했습니다.", "error");
                    }
                  }}
                  type="button"
                >
                  서식 다운로드
                </button>
                <button className="mini-button" onClick={() => baseUploadRef.current?.click()} type="button">
                  명단 업로드(Excel)
                </button>
                <input
                  ref={baseUploadRef}
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden-input"
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
                  type="file"
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2>새 연수 등록</h2>
              <p className="micro-copy">현재 저장 위치: {cloudEnabled ? "학교 GAS 저장소" : "학교 설정 필요"}</p>
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
                <Building size={18} style={{ marginRight: "6px" }} /> 학교형
              </label>
              <label className={`toggle-card ${form.type === "office" ? "is-active" : ""}`}>
                <input
                  checked={form.type === "office"}
                  onChange={() => updateField("type", "office")}
                  type="radio"
                />
                <Building2 size={18} style={{ marginRight: "6px" }} /> 기관 공개
              </label>
            </div>

            <div className="form-grid">
              <input
                className="text-input"
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="연수명"
                value={form.title}
              />
              <input
                className="text-input"
                onChange={(event) => updateField("schoolName", event.target.value)}
                placeholder="기관명"
                value={form.schoolName}
              />
              <input
                className="text-input"
                onChange={(event) => updateField("date", event.target.value)}
                type="date"
                value={form.date}
              />
              <input
                className="text-input"
                onChange={(event) => updateField("time", event.target.value)}
                placeholder="시간 (예: 15:00~17:00)"
                value={form.time}
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
                onChange={(event) => updateField("authCode", event.target.value)}
                placeholder="비밀번호"
                value={form.authCode}
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
              <p className="micro-copy">기존 연수 목록은 명단 업로드와 무관하게 그대로 유지됩니다.</p>
            </div>
          </div>

          <div className="session-list">
            {sessions.length ? (
              sessions.map((session) => (
                <SessionCard
                  busy={busy}
                  key={session.id}
                  notify={notify}
                  onDeleteSession={onDeleteSession}
                  onOpenReport={onOpenReport}
                  onOpenShare={onOpenShare}
                  onUpdateSession={onUpdateSession}
                  onUpdateStaff={(sessionId) => {
                    updateTargetIdRef.current = sessionId;
                    updateUploadRef.current?.click();
                  }}
                  session={session}
                />
              ))
            ) : (
              <div className="empty-compact">
                <p>{cloudEnabled ? "학교 GAS 저장소" : "현재 학교 설정"}에 등록된 연수가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <input
        ref={updateUploadRef}
        accept=".xlsx,.xls,.csv,.txt"
        className="hidden-input"
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
        type="file"
      />
    </section>
  );
}
