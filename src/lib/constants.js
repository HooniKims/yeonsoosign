export const APP_NAME = "온라인 연수연명부";
export const APP_DESCRIPTION = "연수 생성, 참여 서명, 출력까지 한 곳에서 관리하세요.";
export const APP_VERSION = "v0.9";

export const STORAGE_KEYS = {
  sessions: "training_app_sessions_v1",
  staffList: "training_app_staff_list_v1",
  cloudConfig: "training_app_cloud_config",
  googleClientId: "training_app_google_client_id",
  lastSchool: "training_app_last_school",
  sortOrder: "training_app_sort_order_v2",
  config: "training_app_config_v1",
};

export const SESSION_TYPES = {
  school: "school",
  office: "office",
};

export const PAGE_SIZE_OPTIONS = [26, 28, 30, 32, 34, 36, 38, 40];

export const DEFAULT_POSITION_ORDER = [
  "원장",
  "원감",
  "교장",
  "교감",
  "부장교사",
  "교사",
  "강사",
  "행정실장",
  "주무관",
  "실무사",
  "직원",
  "기타",
];

export const DEFAULT_CLOUD_CONFIG = {
  enabled: false,
  scriptUrl: "",
};

export const APPS_SCRIPT_SNIPPET = `const DB_FILE_NAME = "TrainingRegister_DB.json";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "getSessions";
  return handleAction(action, null);
}

function doPost(e) {
  const payload = e && e.postData && e.postData.contents
    ? JSON.parse(e.postData.contents)
    : {};
  return handleAction(payload.action, payload);
}

function handleAction(action, payload) {
  try {
    const db = readDatabase();

    if (action === "getSessions") {
      return json({ status: "success", data: db.sessions || [] });
    }

    if (action === "createSession") {
      const nextSession = payload.session;
      db.sessions = (db.sessions || []).filter((item) => item.id !== nextSession.id);
      db.sessions.push(nextSession);
      writeDatabase(db);
      return json({ status: "success" });
    }

    if (action === "deleteSession") {
      db.sessions = (db.sessions || []).filter((item) => item.id !== payload.sessionId);
      writeDatabase(db);
      return json({ status: "success" });
    }

    if (action === "addSignatureBatch") {
      const sessionIds = payload.sessionIds || [];
      const signature = payload.signature;

      db.sessions = (db.sessions || []).map((session) => {
        if (!sessionIds.includes(session.id)) {
          return session;
        }

        const signatures = session.signatures || [];
        const index = signatures.findIndex((item) => item.staffId === signature.staffId);

        if (index >= 0) {
          signatures[index] = signature;
        } else {
          signatures.push(signature);
        }

        return { ...session, signatures };
      });

      writeDatabase(db);
      return json({ status: "success" });
    }

    if (action === "removeSignatureBatch") {
      const sessionIds = payload.sessionIds || [];
      const staffId = payload.staffId;

      db.sessions = (db.sessions || []).map((session) => {
        if (!sessionIds.includes(session.id)) {
          return session;
        }

        return {
          ...session,
          signatures: (session.signatures || []).filter((item) => item.staffId !== staffId),
        };
      });

      writeDatabase(db);
      return json({ status: "success" });
    }

    return json({ status: "error", message: "Unknown action." });
  } catch (error) {
    return json({ status: "error", message: String(error) });
  }
}

function readDatabase() {
  const files = DriveApp.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    const file = files.next();
    return JSON.parse(file.getBlob().getDataAsString());
  }
  return { sessions: [] };
}

function writeDatabase(data) {
  const files = DriveApp.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    files.next().setContent(JSON.stringify(data));
    return;
  }
  DriveApp.createFile(DB_FILE_NAME, JSON.stringify(data));
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;
