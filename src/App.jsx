import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import AdminView from "./components/AdminView";
import AuthView from "./components/AuthView";
import CloudSetupView from "./components/CloudSetupView";
import LandingView from "./components/LandingView";
import PrintPreview from "./components/PrintPreview";
import ShareDialog from "./components/ShareDialog";
import SignatureModal from "./components/SignatureModal";
import SignerView from "./components/SignerView";
import { deleteOwnAdminAccount } from "./lib/adminManagement";
import { APP_NAME, DEFAULT_CLOUD_CONFIG } from "./lib/constants";
import { signInWithEmail, signInWithGoogle, signOutAdmin, signUpWithEmail, subscribeToAuthState } from "./lib/auth";
import { hasFirebaseConfig } from "./lib/firebase";
import {
  readSchoolConfigById,
  saveDefaultStaffCache,
  saveSchoolConfig,
  subscribeToAdminProfile,
  subscribeToSchoolConfig,
  updateAdminStatus,
} from "./lib/schools";
import {
  addSignatureBatch,
  deleteSession,
  listSessions,
  removeSignatureBatch,
  testScriptUrl,
  upsertSession,
  validateScriptUrl,
} from "./lib/sessions";
import { createId } from "./lib/storage";

const HISTORY_MARKER = "yeonsoo-sign-route";
const VALID_VIEWS = new Set(["landing", "auth", "admin", "cloud_setup", "signer", "report"]);
const REPORT_REFRESH_INTERVAL_MS = 2500;

function createRouteState({
  index = 0,
  view = "landing",
  activeSessionId = null,
  reportSessionId = null,
  directEntry = false,
  schoolId = null,
}) {
  const safeView = VALID_VIEWS.has(view) ? view : "landing";

  return {
    marker: HISTORY_MARKER,
    index: Number.isFinite(index) ? index : 0,
    view: safeView,
    activeSessionId: safeView === "signer" ? activeSessionId || null : null,
    reportSessionId: safeView === "report" ? reportSessionId || null : null,
    schoolId: safeView === "signer" ? schoolId || null : null,
    directEntry: Boolean(safeView === "signer" && (activeSessionId || schoolId) && directEntry),
  };
}

function buildBaseUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function buildRouteUrl(routeState, config) {
  const url = new URL(buildBaseUrl());

  if (routeState.view === "signer") {
    if (routeState.activeSessionId) {
      url.searchParams.set("sessionId", routeState.activeSessionId);
    }

    if (routeState.schoolId) {
      url.searchParams.set("schoolId", routeState.schoolId);
    } else if (routeState.activeSessionId && config?.enabled && config.scriptUrl) {
      url.searchParams.set("endpoint", config.scriptUrl);
    }
  }

  return url.toString();
}

function buildShareUrl(sessionId, schoolId, config) {
  const url = new URL(buildBaseUrl());
  url.searchParams.set("sessionId", sessionId);

  if (schoolId) {
    url.searchParams.set("schoolId", schoolId);
  } else if (config?.enabled && config.scriptUrl) {
    url.searchParams.set("endpoint", config.scriptUrl);
  }

  return url.toString();
}

function getInitialSessionId() {
  return new URLSearchParams(window.location.search).get("sessionId");
}

function getInitialSchoolId() {
  return new URLSearchParams(window.location.search).get("schoolId");
}

function getInitialLegacyCloudConfig() {
  const endpoint = new URLSearchParams(window.location.search).get("endpoint");

  if (!endpoint) {
    return DEFAULT_CLOUD_CONFIG;
  }

  return {
    enabled: true,
    scriptUrl: endpoint,
  };
}

function readUrlRouteState() {
  const sessionId = getInitialSessionId();
  const schoolId = getInitialSchoolId();

  return createRouteState({
    view: sessionId || schoolId ? "signer" : "landing",
    activeSessionId: sessionId,
    schoolId,
    directEntry: Boolean(sessionId || schoolId),
  });
}

function readHistoryRouteState(historyState) {
  if (!historyState || historyState.marker !== HISTORY_MARKER) {
    return null;
  }

  return createRouteState({
    index: historyState.index,
    view: historyState.view,
    activeSessionId: historyState.activeSessionId,
    reportSessionId: historyState.reportSessionId,
    directEntry: historyState.directEntry,
    schoolId: historyState.schoolId,
  });
}

function getInitialRouteState() {
  return readHistoryRouteState(window.history.state) || readUrlRouteState();
}

function buildCloudConfig(scriptUrl) {
  if (!scriptUrl) {
    return DEFAULT_CLOUD_CONFIG;
  }

  try {
    return {
      enabled: true,
      scriptUrl: validateScriptUrl(scriptUrl),
    };
  } catch {
    return DEFAULT_CLOUD_CONFIG;
  }
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
  const initialLegacyCloudConfigRef = useRef(getInitialLegacyCloudConfig());
  const initialRouteRef = useRef(getInitialRouteState());
  const [view, setView] = useState(initialRouteRef.current.view);
  const [sessions, setSessions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(initialRouteRef.current.activeSessionId);
  const [reportSessionId, setReportSessionId] = useState(initialRouteRef.current.reportSessionId);
  const [shareSessionId, setShareSessionId] = useState(null);
  const [signatureRequest, setSignatureRequest] = useState(null);
  const [routeSchoolId, setRouteSchoolId] = useState(initialRouteRef.current.schoolId);
  const [directEntry, setDirectEntry] = useState(initialRouteRef.current.directEntry);
  const [authIntent, setAuthIntent] = useState("admin");
  const [authReady, setAuthReady] = useState(!hasFirebaseConfig);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);
  const [adminSchoolConfig, setAdminSchoolConfig] = useState(null);
  const [adminSchoolLoading, setAdminSchoolLoading] = useState(false);
  const [routeSchoolConfig, setRouteSchoolConfig] = useState(null);
  const [routeSchoolLoading, setRouteSchoolLoading] = useState(false);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const historyIndexRef = useRef(initialRouteRef.current.index);
  const activeCloudConfigRef = useRef(initialLegacyCloudConfigRef.current);
  const reportSyncInFlightRef = useRef(false);

  const activeAdminSchoolId = adminProfile?.schoolId || null;
  const currentSchoolName = adminSchoolConfig?.schoolName || adminProfile?.schoolName || "";
  const currentUserLabel = currentUser?.displayName || currentUser?.email || "관리자";
  const adminCloudConfig = useMemo(
    () => buildCloudConfig(adminSchoolConfig?.gasWebAppUrl),
    [adminSchoolConfig?.gasWebAppUrl],
  );
  const routeCloudConfig = useMemo(() => {
    if (routeSchoolConfig?.gasWebAppUrl) {
      return buildCloudConfig(routeSchoolConfig.gasWebAppUrl);
    }

    return initialLegacyCloudConfigRef.current;
  }, [routeSchoolConfig?.gasWebAppUrl]);
  const shouldUseRouteConfig = view === "signer" && (Boolean(routeSchoolId) || directEntry || routeCloudConfig.enabled);
  const activeCloudConfig = shouldUseRouteConfig ? routeCloudConfig : adminCloudConfig;
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

  function applyRouteState(routeState) {
    historyIndexRef.current = routeState.index;
    setView(routeState.view);
    setActiveSessionId(routeState.activeSessionId);
    setReportSessionId(routeState.reportSessionId);
    setRouteSchoolId(routeState.schoolId);
    setDirectEntry(routeState.directEntry);
    setShareSessionId(null);
    setSignatureRequest(null);
  }

  function writeRouteState(routeState, options = {}) {
    const { replace = false, config = activeCloudConfigRef.current } = options;
    const method = replace ? "replaceState" : "pushState";
    historyIndexRef.current = routeState.index;
    window.history[method](routeState, "", buildRouteUrl(routeState, config));
  }

  function transitionTo(route, options = {}) {
    const { replace = false, config } = options;
    const nextRoute = createRouteState({
      ...route,
      index: replace ? historyIndexRef.current : historyIndexRef.current + 1,
    });

    applyRouteState(nextRoute);
    writeRouteState(nextRoute, { replace, config });
  }

  function goBack(fallbackRoute) {
    const currentRoute = readHistoryRouteState(window.history.state);
    const currentIndex = currentRoute?.index ?? historyIndexRef.current;

    if (currentIndex > 0) {
      window.history.back();
      return;
    }

    transitionTo(fallbackRoute, { replace: true });
  }

  function notify(message, type = "success") {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  }

  function getAdminWritableConfig() {
    if (!adminCloudConfig.enabled || !adminCloudConfig.scriptUrl) {
      notify("학교 Apps Script 주소를 먼저 설정해 주세요.", "error");
      return null;
    }

    return adminCloudConfig;
  }

  async function refreshSessions(nextConfig = activeCloudConfig, options = {}) {
    const { silent = false } = options;

    if (!nextConfig?.enabled || !nextConfig.scriptUrl) {
      startTransition(() => {
        setSessions([]);
      });
      setLoading(false);
      if (!silent) {
        setBusy(false);
      }
      return [];
    }

    if (!silent) {
      setBusy(true);
    }

    setLoading(true);

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
      if (!silent) {
        setBusy(false);
      }
    }
  }

  async function runAuthAction(action, successMessage) {
    setAuthBusy(true);

    try {
      const user = await action();
      setCurrentUser(user);
      notify(successMessage);

      if (authIntent === "cloud_setup") {
        transitionTo({ view: "cloud_setup" });
        return;
      }

      transitionTo({ view: "admin" });
    } catch (error) {
      notify(error.message || "인증 처리에 실패했습니다.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    activeCloudConfigRef.current = activeCloudConfig;
  }, [activeCloudConfig]);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setAuthReady(true);
      return undefined;
    }

    return subscribeToAuthState((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setAdminProfile(null);
      setAdminProfileLoading(false);
      return undefined;
    }

    setAdminProfileLoading(true);

    return subscribeToAdminProfile(currentUser.uid, (profile) => {
      setAdminProfile(profile);
      setAdminProfileLoading(false);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!adminProfile?.schoolId) {
      setAdminSchoolConfig(null);
      setAdminSchoolLoading(false);
      setStaffList([]);
      return undefined;
    }

    setAdminSchoolLoading(true);

    return subscribeToSchoolConfig(
      adminProfile.schoolId,
      (config) => {
        setAdminSchoolConfig(config);
        setStaffList(config?.defaultStaffCache || []);
        setAdminSchoolLoading(false);
      },
      { includePrivate: true },
    );
  }, [adminProfile?.schoolId]);

  useEffect(() => {
    if (!routeSchoolId) {
      setRouteSchoolConfig(null);
      setRouteSchoolLoading(false);
      return undefined;
    }

    if (routeSchoolId === adminProfile?.schoolId && adminSchoolConfig) {
      setRouteSchoolConfig(adminSchoolConfig);
      setRouteSchoolLoading(false);
      return undefined;
    }

    let cancelled = false;
    setRouteSchoolLoading(true);

    readSchoolConfigById(routeSchoolId, { includePrivate: false })
      .then((config) => {
        if (!cancelled) {
          setRouteSchoolConfig(config);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRouteSchoolConfig(null);
          notify(error.message || "학교 설정을 불러오지 못했습니다.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRouteSchoolLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adminProfile?.schoolId, adminSchoolConfig, routeSchoolId]);

  useEffect(() => {
    writeRouteState(initialRouteRef.current, {
      replace: true,
      config: activeCloudConfigRef.current,
    });

    function handlePopState(event) {
      const nextRoute = readHistoryRouteState(event.state) || readUrlRouteState();
      applyRouteState(nextRoute);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
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
    writeRouteState(
      createRouteState({
        index: historyIndexRef.current,
        view,
        activeSessionId,
        reportSessionId,
        directEntry,
        schoolId: routeSchoolId,
      }),
      { replace: true, config: activeCloudConfig },
    );
  }, [activeCloudConfig, activeSessionId, directEntry, reportSessionId, routeSchoolId, view]);

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

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    if ((view === "admin" || view === "cloud_setup") && !currentUser) {
      setAuthIntent(view === "cloud_setup" ? "cloud_setup" : "admin");
      transitionTo({ view: "auth" }, { replace: true });
      return undefined;
    }

    return undefined;
  }, [authReady, currentUser, view]);

  useEffect(() => {
    if (view !== "admin" || !currentUser || adminProfileLoading || adminSchoolLoading) {
      return;
    }

    if (!adminCloudConfig.enabled) {
      transitionTo({ view: "cloud_setup" }, { replace: true });
    }
  }, [adminCloudConfig.enabled, adminProfileLoading, adminSchoolLoading, currentUser, view]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    if (!shouldUseRouteConfig && currentUser && (adminProfileLoading || adminSchoolLoading)) {
      return undefined;
    }

    if (shouldUseRouteConfig && routeSchoolLoading) {
      return undefined;
    }

    const canLoadAdminData = !shouldUseRouteConfig && currentUser;
    const canLoadSignerData = shouldUseRouteConfig;

    if (!canLoadAdminData && !canLoadSignerData) {
      startTransition(() => {
        setSessions([]);
      });
      setLoading(false);
      return undefined;
    }

    if (!activeCloudConfig.enabled || !activeCloudConfig.scriptUrl) {
      startTransition(() => {
        setSessions([]);
      });
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    listSessions(activeCloudConfig)
      .then((nextSessions) => {
        if (!cancelled) {
          startTransition(() => {
            setSessions(nextSessions);
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify(error.message || "데이터를 불러오지 못했습니다.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCloudConfig,
    adminProfileLoading,
    adminSchoolLoading,
    authReady,
    currentUser,
    routeSchoolLoading,
    shouldUseRouteConfig,
  ]);

  useEffect(() => {
    if (view !== "report" || !reportSessionId || !adminCloudConfig.enabled || !adminCloudConfig.scriptUrl) {
      reportSyncInFlightRef.current = false;
      return undefined;
    }

    async function syncReport() {
      if (reportSyncInFlightRef.current) {
        return;
      }

      reportSyncInFlightRef.current = true;

      try {
        await refreshSessions(adminCloudConfig, { silent: true });
      } finally {
        reportSyncInFlightRef.current = false;
      }
    }

    syncReport();

    const intervalId = window.setInterval(syncReport, REPORT_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", syncReport);

    return () => {
      reportSyncInFlightRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncReport);
    };
  }, [adminCloudConfig, reportSessionId, view]);

  async function handleCreateSession(payload) {
    const config = getAdminWritableConfig();

    if (!config) {
      return false;
    }

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
      const nextSessions = await upsertSession(config, session);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(config, { silent: true });
      }

      notify("연수가 학교 GAS 저장소에 저장되었습니다.");
      return true;
    } catch (error) {
      notify(error.message || "연수 등록에 실패했습니다.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateDefaultStaffList(list) {
    if (!activeAdminSchoolId) {
      notify("학교 정보가 없어 기본 명단을 저장할 수 없습니다.", "error");
      return;
    }

    setBusy(true);

    try {
      await saveDefaultStaffCache(activeAdminSchoolId, list);
      setStaffList(list);
      notify(`기본 명단 ${list.length}명이 저장되었습니다.`);
    } catch (error) {
      notify(error.message || "기본 명단 저장에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearDefaultStaffList() {
    if (!activeAdminSchoolId) {
      notify("학교 정보가 없어 기본 명단을 초기화할 수 없습니다.", "error");
      return;
    }

    if (!window.confirm("모든 기본 교직원 명단을 삭제하시겠습니까?")) {
      return;
    }

    setBusy(true);

    try {
      await saveDefaultStaffCache(activeAdminSchoolId, []);
      setStaffList([]);
      notify("기본 교직원 명단이 초기화되었습니다.");
    } catch (error) {
      notify(error.message || "기본 명단 초기화에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplaceSessionStaffList(sessionId, nextStaffList) {
    const config = getAdminWritableConfig();

    if (!config) {
      return;
    }

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

      if (!mergedStaff.some((item) => item.id === candidate.id)) {
        mergedStaff.push(candidate);
      }
    }

    setBusy(true);

    try {
      const nextSessions = await upsertSession(config, {
        ...session,
        staffList: mergedStaff,
      });

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(config, { silent: true });
      }

      notify(`연수 명단이 업데이트되었습니다. (총 ${mergedStaff.length}명 등록)`);
    } catch (error) {
      notify(error.message || "연수 명단 업데이트에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateSession(sessionId, payload) {
    const config = getAdminWritableConfig();

    if (!config) {
      return false;
    }

    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      notify("연수 정보를 다시 불러와 주세요.", "error");
      return false;
    }

    setBusy(true);

    try {
      const nextSession = {
        ...session,
        authCode: payload.authCode || "",
        date: payload.date,
        schoolName: payload.schoolName,
        time: payload.time,
        title: payload.title,
      };
      const nextSessions = await upsertSession(config, nextSession);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(config, { silent: true });
      }

      notify("연수 정보가 수정되었습니다.");
      return true;
    } catch (error) {
      notify(error.message || "연수 수정에 실패했습니다.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    const config = getAdminWritableConfig();

    if (!config) {
      return;
    }

    if (!window.confirm("이 연수를 삭제하시겠습니까? 서명 데이터도 함께 삭제됩니다.")) {
      return;
    }

    setBusy(true);

    try {
      const nextSessions = await deleteSession(config, sessionId);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(config, { silent: true });
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
    if (!activeAdminSchoolId || !currentUser) {
      notify("학교 설정을 저장할 관리자를 찾지 못했습니다.", "error");
      return;
    }

    let config = DEFAULT_CLOUD_CONFIG;

    if (nextConfig.enabled) {
      try {
        config = {
          enabled: true,
          scriptUrl: validateScriptUrl(nextConfig.scriptUrl),
        };
      } catch (error) {
        notify(error.message || "학교 URL을 다시 확인해 주세요.", "error");
        return;
      }
    }

    setBusy(true);

    try {
      await Promise.all([
        saveSchoolConfig(activeAdminSchoolId, {
          gasWebAppUrl: config.scriptUrl,
          schoolName: currentSchoolName || adminProfile?.schoolName || "",
        }),
        updateAdminStatus(currentUser.uid, config.enabled ? "active" : "pending_setup"),
      ]);

      if (config.enabled) {
        await refreshSessions(config, { silent: true });
        transitionTo({ view: "admin" }, { config });
        notify("학교 GAS 설정이 저장되었습니다.");
        return;
      }

      setSessions([]);
      transitionTo({ view: "cloud_setup" }, { config: DEFAULT_CLOUD_CONFIG });
      notify("학교 GAS 설정이 해제되었습니다.");
    } catch (error) {
      notify(error.message || "학교 설정 저장에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  function openAdminExperience() {
    if (!currentUser) {
      setAuthIntent("admin");
      transitionTo({ view: "auth" });
      return;
    }

    if (!adminCloudConfig.enabled) {
      transitionTo({ view: "cloud_setup" });
      return;
    }

    transitionTo({ view: "admin" });
  }

  function openSchoolSettings() {
    if (!currentUser) {
      setAuthIntent("cloud_setup");
      transitionTo({ view: "auth" });
      return;
    }

    transitionTo({ view: "cloud_setup" });
  }

  function openSignerHome() {
    transitionTo({
      view: "signer",
      activeSessionId: null,
      directEntry: false,
      schoolId: activeAdminSchoolId || routeSchoolId || null,
    });
  }

  function openSignerSession(sessionId) {
    transitionTo({
      view: "signer",
      activeSessionId: sessionId,
      directEntry: false,
      schoolId: routeSchoolId || activeAdminSchoolId || null,
    });
  }

  function clearSignerSelection() {
    goBack({
      view: "signer",
      activeSessionId: null,
      directEntry: false,
      schoolId: routeSchoolId || activeAdminSchoolId || null,
    });
  }

  async function openReport(sessionId) {
    let nextSessions = sessions;

    if (adminCloudConfig.enabled && adminCloudConfig.scriptUrl) {
      nextSessions = (await refreshSessions(adminCloudConfig)) || sessions;
    }

    if (!nextSessions.some((item) => item.id === sessionId)) {
      notify("연수 정보를 다시 불러온 뒤에 출력해 주세요.", "error");
      return;
    }

    transitionTo({
      view: "report",
      reportSessionId: sessionId,
    });
  }

  function openShare(session) {
    setShareSessionId(session.id);
  }

  async function handleCopyShareUrl() {
    if (!shareSession) {
      return;
    }

    await navigator.clipboard.writeText(buildShareUrl(shareSession.id, activeAdminSchoolId, adminCloudConfig));
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

    if (!activeCloudConfig.enabled || !activeCloudConfig.scriptUrl) {
      notify("학교 설정이 없어 서명을 저장할 수 없습니다.", "error");
      return;
    }

    const signature = normalizeSignaturePayload(signatureRequest.participant, dataUrl);

    setSignatureSaving(true);
    setBusy(true);

    try {
      const nextSessions = await addSignatureBatch(activeCloudConfig, [session.id], signature);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(activeCloudConfig, { silent: true });
      }

      notify(`${signature.staffName}님의 서명이 저장되었습니다.`);
      setSignatureRequest(null);
    } catch (error) {
      notify(error.message || "서명 저장에 실패했습니다.", "error");
    } finally {
      setSignatureSaving(false);
      setBusy(false);
    }
  }

  async function handleDeleteSignature(sessionId, staffId) {
    const session = sessions.find((item) => item.id === sessionId);

    if (!session || !adminCloudConfig.enabled || !adminCloudConfig.scriptUrl) {
      return;
    }

    if (!window.confirm("이 세션에서 해당 서명을 삭제하시겠습니까?")) {
      return;
    }

    setBusy(true);

    try {
      const nextSessions = await removeSignatureBatch(adminCloudConfig, [session.id], staffId);

      if (nextSessions) {
        setSessions(nextSessions);
      } else {
        await refreshSessions(adminCloudConfig, { silent: true });
      }

      notify("서명이 삭제되었습니다.");
    } catch (error) {
      notify(error.message || "서명 삭제에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!hasFirebaseConfig) {
      return;
    }

    setAuthBusy(true);

    try {
      await signOutAdmin();
      setCurrentUser(null);
      transitionTo({ view: "landing" }, { replace: true });
      notify("로그아웃되었습니다.");
    } catch (error) {
      notify(error.message || "로그아웃에 실패했습니다.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleDeleteOwnAccount() {
    if (!currentUser) {
      return;
    }

    if (!window.confirm("내 관리자 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setBusy(true);

    try {
      await deleteOwnAdminAccount();

      try {
        await signOutAdmin();
      } catch {
        // 서버에서 계정이 제거된 뒤에는 클라이언트 로그아웃이 실패할 수 있어 무시한다.
      }

      setCurrentUser(null);
      transitionTo({ view: "landing" }, { replace: true });
      notify("내 계정이 탈퇴 처리되었습니다.");
    } catch (error) {
      notify(error.message || "계정 탈퇴에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = shareSession
    ? buildShareUrl(shareSession.id, activeAdminSchoolId, adminCloudConfig)
    : "";
  const screenLoading =
    !authReady ||
    ((view === "admin" || view === "cloud_setup") && currentUser && (adminProfileLoading || adminSchoolLoading)) ||
    (view === "signer" && routeSchoolId && routeSchoolLoading && sessions.length === 0);

  if (screenLoading) {
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
          cloudEnabled={adminCloudConfig.enabled}
          currentSchoolName={currentSchoolName}
          currentUserLabel={currentUserLabel}
          isSignedIn={Boolean(currentUser)}
          onOpenAdmin={openAdminExperience}
          onOpenCloud={openSchoolSettings}
          onOpenSigner={openSignerHome}
          onSignOut={handleLogout}
        />
      ) : null}

      {view === "auth" ? (
        <AuthView
          authBusy={authBusy}
          intent={authIntent}
          onBack={() => goBack({ view: "landing" })}
          onEmailLogin={(payload) =>
            runAuthAction(() => signInWithEmail(payload), "관리자 로그인이 완료되었습니다.")
          }
          onEmailSignup={(payload) =>
            runAuthAction(() => signUpWithEmail(payload), "관리자 가입이 완료되었습니다.")
          }
          onGoogleLogin={() =>
            runAuthAction(() => signInWithGoogle({ mode: "login" }), "Google 로그인이 완료되었습니다.")
          }
          onGoogleSignup={(school) =>
            runAuthAction(
              () => signInWithGoogle({ mode: "signup", school }),
              "Google 계정으로 관리자 가입이 완료되었습니다.",
            )
          }
        />
      ) : null}

      {view === "admin" ? (
        <AdminView
          adminEmail={currentUser?.email || ""}
          adminName={currentUser?.displayName || ""}
          busy={busy}
          cloudEnabled={adminCloudConfig.enabled}
          initialSchoolName={currentSchoolName}
          notify={notify}
          onBack={() => transitionTo({ view: "landing" })}
          onClearDefaultStaffList={handleClearDefaultStaffList}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onDeleteOwnAccount={handleDeleteOwnAccount}
          onOpenCloud={openSchoolSettings}
          onOpenReport={openReport}
          onOpenShare={openShare}
          onRefresh={() => refreshSessions(adminCloudConfig)}
          onReplaceSessionStaffList={handleReplaceSessionStaffList}
          onSignOut={handleLogout}
          onUpdateSession={handleUpdateSession}
          onUpdateDefaultStaffList={handleUpdateDefaultStaffList}
          schoolName={currentSchoolName}
          sessions={sessions}
          staffList={staffList}
        />
      ) : null}

      {view === "cloud_setup" ? (
        <CloudSetupView
          adminEmail={currentUser?.email || ""}
          busy={busy}
          currentConfig={adminCloudConfig}
          onBack={() => goBack({ view: currentUser ? "admin" : "landing" })}
          onSave={handleSaveCloudConfig}
          onTest={testScriptUrl}
          schoolName={currentSchoolName}
        />
      ) : null}

      {view === "signer" ? (
        <SignerView
          activeSessionId={activeSessionId}
          busy={busy || loading}
          directEntry={directEntry}
          onClearSelection={clearSignerSelection}
          onRequestSignature={handleRequestSignature}
          onSelectSession={openSignerSession}
          sessions={sessions}
        />
      ) : null}

      {view === "report" && reportSession ? (
        <PrintPreview
          busy={busy}
          onClose={() => goBack({ view: "admin" })}
          onDeleteSignature={handleDeleteSignature}
          session={reportSession}
        />
      ) : null}

      {signatureRequest ? (
        <SignatureModal
          onCancel={() => setSignatureRequest(null)}
          onSave={handleSaveSignature}
          participantName={signatureRequest.participant.name}
          saving={signatureSaving}
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
