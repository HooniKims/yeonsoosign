import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import AdminView from "./components/AdminView";
import CloudSetupView from "./components/CloudSetupView";
import LandingView from "./components/LandingView";
import PrintPreview from "./components/PrintPreview";
import ShareDialog from "./components/ShareDialog";
import SignatureModal from "./components/SignatureModal";
import SignerView from "./components/SignerView";
import { APP_NAME, DEFAULT_CLOUD_CONFIG } from "./lib/constants";
import {
  addSignatureBatch,
  deleteSession,
  listSessions,
  removeSignatureBatch,
  testScriptUrl,
  upsertSession,
  validateScriptUrl,
} from "./lib/sessions";
import {
  createId,
  readCloudConfig,
  readGoogleClientId,
  readLastSchool,
  readStaffList,
  writeCloudConfig,
  writeGoogleClientId,
  writeLastSchool,
  writeStaffList,
} from "./lib/storage";

function buildBaseUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function buildShareUrl(sessionId, cloudConfig) {
  const url = new URL(buildBaseUrl());
  url.searchParams.set("sessionId", sessionId);

  if (cloudConfig.enabled && cloudConfig.scriptUrl) {
    url.searchParams.set("endpoint", cloudConfig.scriptUrl);
  }

  return url.toString();
}

function getInitialSessionId() {
  return new URLSearchParams(window.location.search).get("sessionId");
}

function getInitialCloudConfig() {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");

  if (endpoint) {
    return {
      enabled: true,
      scriptUrl: endpoint,
    };
  }

  return readCloudConfig();
}

function getInitialView() {
  return getInitialSessionId() ? "signer" : "landing";
}

function normalizeSignaturePayload(participant, dataUrl) {
  return {
    staffId: participant.id,
    staffName: participant.name,
    department: participant.department || participant.position || "",
    affiliation: participant.affiliation || "",
    signatureData: dataUrl,
    timestamp: Date.now(),
  };
}

export default function App() {
  const [view, setView] = useState(getInitialView);
  const [sessions, setSessions] = useState([]);
  const [staffList, setStaffList] = useState(() => readStaffList());
  const [lastSchoolName, setLastSchoolName] = useState(() => readLastSchool());
  const [cloudConfig, setCloudConfig] = useState(getInitialCloudConfig);
  const [googleClientId, setGoogleClientId] = useState(() => readGoogleClientId());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(getInitialSessionId);
  const [reportSessionId, setReportSessionId] = useState(null);
  const [shareSessionId, setShareSessionId] = useState(null);
  const [signatureRequest, setSignatureRequest] = useState(null);
  const directEntryRef = useRef(Boolean(getInitialSessionId()));

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );
  const reportSession = useMemo(
    () => sessions.find((item) => item.id === reportSessionId) || null,
    [reportSessionId, sessions],
  );
  const shareSession = useMemo(
    () => sessions.find((item) => item.id === shareSessionId) || null,
    [sessions, shareSessionId],
  );

  function notify(message, type = "success") {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  }

  async function refreshSessions(nextConfig = cloudConfig, options = {}) {
    const { silent = false } = options;

    if (!silent) {
      setBusy(true);
    }

    try {
      const nextSessions = await listSessions(nextConfig);
      startTransition(() => {
        setSessions(nextSessions);
      });
      return nextSessions;
    } catch (error) {
      notify(error.message || "데이터를 불러오지 못했습니다.", "error");
      return null;
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshSessions(cloudConfig, { silent: true });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (view === "signer" && activeSessionId) {
      url.searchParams.set("sessionId", activeSessionId);

      if (cloudConfig.enabled && cloudConfig.scriptUrl) {
        url.searchParams.set("endpoint", cloudConfig.scriptUrl);
      } else {
        url.searchParams.delete("endpoint");
      }
    } else {
      url.searchParams.delete("sessionId");
      url.searchParams.delete("endpoint");
    }

    window.history.replaceState({}, "", url.toString());
  }, [activeSessionId, cloudConfig, view]);

  useEffect(() => {
    if (reportSession) {
      document.title = `${reportSession.title} - ${APP_NAME}`;
      return;
    }

    if (activeSession) {
      document.title = `${activeSession.title} - ${APP_NAME}`;
      return;
    }

    document.title = APP_NAME;
  }, [activeSession, reportSession]);

  async function handleCreateSession(payload) {
    const session = {
      id: createId(),
      type: payload.type,
      title: payload.title,
      date: payload.date,
      time: payload.time,
      schoolName: payload.schoolName,
      maxParticipants: payload.type === "school" ? staffList.length || 200 : 500,
      authCode: payload.authCode || "",
      staffList: payload.type === "school" ? [...staffList] : [],
      signatures: [],
      createdAt: Date.now(),
    };

    setBusy(true);

    try {
      const nextSessions = await upsertSession(cloudConfig, session);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(cloudConfig, { silent: true });
      }

      writeLastSchool(payload.schoolName);
      setLastSchoolName(payload.schoolName);
      notify(
        cloudConfig.enabled
          ? "연수가 구글 드라이브에 저장되었습니다."
          : "연수가 로컬 저장소에 저장되었습니다.",
      );
      return true;
    } catch (error) {
      notify(error.message || "연수 등록에 실패했습니다.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleUpdateDefaultStaffList(list) {
    writeStaffList(list);
    setStaffList(list);
    notify(`기본 명단 ${list.length}명이 등록되었습니다.`);
  }

  function handleClearDefaultStaffList() {
    if (!window.confirm("모든 교직원 명단을 삭제하시겠습니까?")) {
      return;
    }

    writeStaffList([]);
    setStaffList([]);
    notify("교직원 명단이 초기화되었습니다.");
  }

  async function handleReplaceSessionStaffList(sessionId, nextStaffList) {
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    const signedIds = new Set((session.signatures || []).map((item) => item.staffId));
    const mergedStaff = nextStaffList.map((item) => {
      const existing = (session.staffList || []).find(
        (candidate) => candidate.name === item.name && candidate.department === item.department,
      );
      return existing || item;
    });

    for (const candidate of session.staffList || []) {
      if (!signedIds.has(candidate.id)) {
        continue;
      }

      const exists = mergedStaff.some((item) => item.id === candidate.id);
      if (!exists) {
        mergedStaff.push(candidate);
      }
    }

    setBusy(true);

    try {
      const nextSessions = await upsertSession(cloudConfig, {
        ...session,
        staffList: mergedStaff,
      });

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(cloudConfig, { silent: true });
      }

      notify("연수 명단이 업데이트되었습니다.");
    } catch (error) {
      notify(error.message || "연수 명단 업데이트에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!window.confirm("이 연수를 삭제하시겠습니까? 서명 데이터도 함께 삭제됩니다.")) {
      return;
    }

    setBusy(true);

    try {
      const nextSessions = await deleteSession(cloudConfig, sessionId);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(cloudConfig, { silent: true });
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }

      notify("연수가 삭제되었습니다.");
    } catch (error) {
      notify(error.message || "연수 삭제에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCloudConfig(nextConfig) {
    let config;

    try {
      config = nextConfig.enabled
        ? {
            enabled: true,
            scriptUrl: validateScriptUrl(nextConfig.scriptUrl),
          }
        : DEFAULT_CLOUD_CONFIG;
    } catch (error) {
      notify(error.message || "클라우드 URL을 다시 확인해 주세요.", "error");
      return;
    }

    writeCloudConfig(config);
    writeGoogleClientId(nextConfig.googleClientId || "");
    setCloudConfig(config);
    setGoogleClientId(nextConfig.googleClientId || "");

    await refreshSessions(config, { silent: true });
    setView("admin");
    notify(config.enabled ? "구글 연동 설정이 저장되었습니다." : "로컬 모드로 전환되었습니다.");
  }

  async function handleStartCloudFlow() {
    if (cloudConfig.enabled && cloudConfig.scriptUrl) {
      await refreshSessions(cloudConfig);
      notify("클라우드 데이터를 새로 불러왔습니다.");
      return;
    }

    setView("cloud_setup");
  }

  function openSignerHome() {
    directEntryRef.current = false;
    setActiveSessionId(null);
    setView("signer");
  }

  function openSignerSession(sessionId) {
    directEntryRef.current = false;
    setActiveSessionId(sessionId);
    setView("signer");
  }

  function clearSignerSelection() {
    setActiveSessionId(null);
    setView("signer");
  }

  function openReport(sessionId) {
    setReportSessionId(sessionId);
    setView("report");
  }

  function openShare(session) {
    setShareSessionId(session.id);
  }

  async function handleCopyShareUrl() {
    if (!shareSession) {
      return;
    }

    await navigator.clipboard.writeText(buildShareUrl(shareSession.id, cloudConfig));
    notify("링크가 복사되었습니다.");
  }

  function handleRequestSignature(session, participant) {
    setSignatureRequest({
      participant,
      sessionId: session.id,
    });
  }

  async function handleSaveSignature(dataUrl) {
    if (!signatureRequest) {
      return;
    }

    const session = sessions.find((item) => item.id === signatureRequest.sessionId);

    if (!session) {
      notify("연수 정보를 다시 불러와 주세요.", "error");
      return;
    }

    const signature = normalizeSignaturePayload(signatureRequest.participant, dataUrl);

    setBusy(true);

    try {
      const nextSessions = await addSignatureBatch(cloudConfig, [session.id], signature);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(cloudConfig, { silent: true });
      }

      notify(`${signature.staffName}님의 서명이 저장되었습니다.`);
      setSignatureRequest(null);
    } catch (error) {
      notify(error.message || "서명 저장에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSignature(sessionId, staffId) {
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    if (!window.confirm("이 세션에서 해당 서명을 삭제하시겠습니까?")) {
      return;
    }

    setBusy(true);

    try {
      const nextSessions = await removeSignatureBatch(cloudConfig, [session.id], staffId);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(cloudConfig, { silent: true });
      }

      notify("서명이 삭제되었습니다.");
    } catch (error) {
      notify(error.message || "서명 삭제에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = shareSession ? buildShareUrl(shareSession.id, cloudConfig) : "";

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <p>{APP_NAME}를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      {view === "landing" ? (
        <LandingView
          cloudEnabled={cloudConfig.enabled}
          onOpenAdmin={() => setView("admin")}
          onOpenCloud={handleStartCloudFlow}
          onOpenSigner={openSignerHome}
        />
      ) : null}

      {view === "admin" ? (
        <AdminView
          busy={busy}
          cloudEnabled={cloudConfig.enabled}
          initialSchoolName={lastSchoolName}
          notify={notify}
          onBack={() => setView("landing")}
          onClearDefaultStaffList={handleClearDefaultStaffList}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onOpenCloud={() => setView("cloud_setup")}
          onOpenReport={openReport}
          onOpenShare={openShare}
          onRefresh={() => refreshSessions(cloudConfig)}
          onReplaceSessionStaffList={handleReplaceSessionStaffList}
          onUpdateDefaultStaffList={handleUpdateDefaultStaffList}
          sessions={sessions}
          staffList={staffList}
        />
      ) : null}

      {view === "cloud_setup" ? (
        <CloudSetupView
          busy={busy}
          currentConfig={cloudConfig}
          googleClientId={googleClientId}
          onBack={() => setView("admin")}
          onSave={handleSaveCloudConfig}
          onTest={testScriptUrl}
        />
      ) : null}

      {view === "signer" ? (
        <SignerView
          activeSessionId={activeSessionId}
          busy={busy}
          directEntry={directEntryRef.current}
          onClearSelection={clearSignerSelection}
          onRequestSignature={handleRequestSignature}
          onSelectSession={openSignerSession}
          sessions={sessions}
        />
      ) : null}

      {view === "report" && reportSession ? (
        <PrintPreview
          busy={busy}
          onClose={() => setView("admin")}
          onDeleteSignature={handleDeleteSignature}
          session={reportSession}
        />
      ) : null}

      {signatureRequest ? (
        <SignatureModal
          onCancel={() => setSignatureRequest(null)}
          onSave={handleSaveSignature}
          participantName={signatureRequest.participant.name}
          sessionTitle={activeSession?.title || "연수"}
        />
      ) : null}

      {shareSession ? (
        <ShareDialog
          onClose={() => setShareSessionId(null)}
          onCopy={handleCopyShareUrl}
          session={shareSession}
          shareUrl={shareUrl}
        />
      ) : null}

      {busy ? (
        <div className="busy-overlay">
          <div className="loading-spinner" />
          <p>데이터 반영 중...</p>
        </div>
      ) : null}

      {toast ? <div className={`toast-pill toast-pill-${toast.type}`}>{toast.message}</div> : null}
    </>
  );
}
