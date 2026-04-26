import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { sortStaffByPositionThenName } from "../lib/sort";

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function createOfficeParticipantId({ affiliation, position, name }) {
  return [
    "office",
    normalizeKeyPart(affiliation),
    normalizeKeyPart(position),
    normalizeKeyPart(name),
  ].join(":");
}

function SessionSelector({ sessions, onSelectSession }) {
  if (!sessions.length) {
    return (
      <div className="empty-shell">
        <h2>서명할 연수 선택</h2>
        <p>현재 열려 있는 연수가 없습니다. 관리자 화면에서 먼저 연수를 등록해주세요.</p>
      </div>
    );
  }

  return (
    <section className="page-shell signer-shell">
      <div className="page-inner page-inner-narrow">
        <header className="page-header page-header-center">
          <div>
            <p className="eyebrow">참여자 화면</p>
            <h1>서명할 연수 선택</h1>
          </div>
        </header>

        <div className="session-picker">
          {sessions.map((session) => (
            <button
              className="session-picker-card"
              key={session.id}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="session-date">{session.date}</span>
              <strong>{session.title}</strong>
              <span>{session.schoolName}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PasscodeGate({ session, sharedEntry, onBack, onUnlock }) {
  const [passcode, setPasscode] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    if (passcode === session.authCode) {
      setIsError(false);
      setPasscode("");
      onUnlock();
      return;
    }

    setIsError(true);
    setPasscode("");
  }

  return (
    <section className="page-shell signer-shell">
      <div className="page-inner page-inner-narrow">
        <div className="gate-card">
          <div className="dialog-header dialog-header-center">
            <h2>{session.title}</h2>
            <p>
              {session.schoolName} | {session.date}
            </p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="notice-card notice-card-cool">인증 비밀번호를 입력해주세요.</div>
            <input
              autoFocus
              className={`text-input passcode-input ${isError ? "is-error" : ""}`}
              inputMode="numeric"
              placeholder="****"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
            />
            {isError ? (
              <p className="inline-feedback inline-feedback-error">
                비밀번호가 일치하지 않습니다.
              </p>
            ) : null}
            <div className="button-row">
              {!sharedEntry ? (
                <button className="ghost-button" type="button" onClick={onBack}>
                  뒤로가기
                </button>
              ) : null}
              <button className="action-button action-button-primary" type="submit">
                확인
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function SchoolSigner({ session, sharedEntry, onBack, onRequestSignature }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const signedStaffIds = useMemo(
    () => new Set((session.signatures || []).map((item) => item.staffId)),
    [session.signatures],
  );

  const sortedStaff = useMemo(
    () => sortStaffByPositionThenName(session.staffList || []),
    [session.staffList]
  );

  const filteredStaff = useMemo(() => {
    const keyword = deferredSearch.trim();

    if (!keyword) {
      return sortedStaff;
    }

    return sortedStaff.filter((item) => {
      return item.name.includes(keyword) || item.department.includes(keyword);
    });
  }, [deferredSearch, sortedStaff]);

  function handleSelect(staff) {
    const signed = signedStaffIds.has(staff.id);

    if (signed && !window.confirm("이미 서명한 구성원입니다. 다시 서명하시겠습니까?")) {
      return;
    }

    onRequestSignature(session, {
      id: staff.id,
      name: staff.name,
      department: staff.department,
      affiliation: "",
    });
  }

  return (
    <section className="page-shell page-shell-flat signer-shell">
      <div className="signer-column">
        <header className="signer-header">
          <div className="signer-header-row">
            {!sharedEntry ? (
              <button className="back-button" onClick={onBack}>
                ←
              </button>
            ) : null}
            <h1>{session.title}</h1>
          </div>
          <input
            className="text-input"
            placeholder="성명 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </header>

        <div className="signer-list">
          {filteredStaff.map((staff) => {
            const signed = signedStaffIds.has(staff.id);

            return (
              <button
                className={`staff-card ${signed ? "staff-card-signed" : ""}`}
                key={staff.id}
                onClick={() => handleSelect(staff)}
              >
                <div className="staff-card-copy">
                  <strong>{staff.name}</strong>
                  <span>{staff.department}</span>
                </div>
                {signed ? <span className="signed-mark">서명완료</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OfficeSigner({ session, onRequestSignature }) {
  const [form, setForm] = useState({
    affiliation: "",
    position: "",
    name: "",
  });
  const existingParticipantIds = useMemo(
    () => new Set((session.signatures || []).map((item) => item.staffId)),
    [session.signatures],
  );

  useEffect(() => {
    setForm({
      affiliation: "",
      position: "",
      name: "",
    });
  }, [session.id]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const affiliation = form.affiliation.trim();
    const position = form.position.trim();
    const name = form.name.trim();

    if (!affiliation || !position || !name) {
      return;
    }

    const participantId = createOfficeParticipantId({
      affiliation,
      position,
      name,
    });

    if (
      existingParticipantIds.has(participantId) &&
      !window.confirm("이미 같은 정보로 서명되어 있습니다. 다시 서명하시겠습니까?")
    ) {
      return;
    }

    onRequestSignature(session, {
      id: participantId,
      name,
      department: position,
      affiliation,
    });
  }

  return (
    <section className="page-shell signer-shell">
      <div className="page-inner page-inner-narrow">
        <div className="office-card">
          <div className="dialog-header dialog-header-center">
            <p className="eyebrow">외부 참여자</p>
            <h2>{session.title}</h2>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <input
              className="text-input"
              placeholder="소속 입력"
              value={form.affiliation}
              onChange={(event) => updateField("affiliation", event.target.value)}
            />
            <input
              className="text-input"
              placeholder="직위 입력"
              value={form.position}
              onChange={(event) => updateField("position", event.target.value)}
            />
            <input
              className="text-input"
              placeholder="성명 입력"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            <button className="action-button action-button-primary action-button-large" type="submit">
              확인 및 서명
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function SignerView({
  activeSessionId,
  busy,
  directEntry,
  onClearSelection,
  onRequestSignature,
  onSelectSession,
  sessions,
}) {
  const session = sessions.find((item) => item.id === activeSessionId);
  const [authUnlocked, setAuthUnlocked] = useState(false);

  useEffect(() => {
    setAuthUnlocked(false);
  }, [activeSessionId]);

  if (busy && sessions.length === 0) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <p>연수 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!activeSessionId) {
    return <SessionSelector onSelectSession={onSelectSession} sessions={sessions} />;
  }

  if (!session) {
    return (
      <div className="empty-shell">
        <h2>연수를 찾을 수 없습니다.</h2>
        <p>공유 링크가 만료되었거나 현재 저장소에 해당 데이터가 없습니다.</p>
      </div>
    );
  }

  if (session.authCode && !authUnlocked) {
    return (
      <PasscodeGate
        onBack={onClearSelection}
        onUnlock={() => setAuthUnlocked(true)}
        session={session}
        sharedEntry={directEntry}
      />
    );
  }

  if (session.type === "school") {
    return (
      <SchoolSigner
        onBack={onClearSelection}
        onRequestSignature={onRequestSignature}
        session={session}
        sharedEntry={directEntry}
      />
    );
  }

  return <OfficeSigner onRequestSignature={onRequestSignature} session={session} />;
}
