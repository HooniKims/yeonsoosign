export const APP_NAME = "온라인 연수연명부";
export const PRINT_TITLE = "연수 연명부";
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
  try {
    const payload = parsePostPayload_(e);
    return handleAction(payload.action, payload);
  } catch (error) {
    return json({ status: "error", message: "저장 요청의 JSON 형식이 올바르지 않습니다." });
  }
}

function parsePostPayload_(e) {
  const raw = e && e.postData && e.postData.contents
    ? String(e.postData.contents).trim()
    : "";

  if (raw) {
    return JSON.parse(raw);
  }

  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  return {};
}

function handleAction(action, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
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
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function readDatabase() {
  const files = DriveApp.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    const file = files.next();
    if (files.hasNext()) {
      throw new Error("같은 이름의 연수 저장 파일이 여러 개 있습니다. 관리자가 TrainingRegister_DB.json 원본 파일을 확인해 주세요.");
    }
    const raw = file.getBlob().getDataAsString().trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error("연수 저장 파일(TrainingRegister_DB.json)이 비어 있거나 손상되었습니다. Google Drive에서 이전 버전을 복원해 주세요. 기존 데이터 보호를 위해 저장을 중단했습니다.");
    }
    if (!data || !Array.isArray(data.sessions)) {
      throw new Error("연수 저장 파일의 sessions 형식이 올바르지 않습니다. Google Drive에서 원본 파일을 확인해 주세요.");
    }
    return data;
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
