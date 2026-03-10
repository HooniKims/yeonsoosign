import { readSessionsLocal, sortSessions, writeSessionsLocal } from "./storage";

const EMPTY_SCRIPT_URL_MESSAGE =
  "\uC571\uC2A4 \uC2A4\uD06C\uB9BD\uD2B8 Web App URL\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
const INVALID_SCRIPT_URL_MESSAGE =
  "\uC62C\uBC14\uB978 URL \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4. http:// \uB610\uB294 https:// \uC8FC\uC18C\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const INVALID_SCRIPT_PROTOCOL_MESSAGE =
  "URL\uC740 http:// \uB610\uB294 https://\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4.";
const INVALID_RESPONSE_MESSAGE =
  "\uC751\uB2F5\uC744 \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
const INVALID_SERVER_RESPONSE_MESSAGE =
  "\uC11C\uBC84 \uC751\uB2F5\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
const REQUEST_FAILED_MESSAGE =
  "\uC694\uCCAD \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
const INVALID_SESSION_DATA_MESSAGE =
  "\uC5F0\uB3D9\uC740 \uC131\uACF5\uD588\uC9C0\uB9CC \uC138\uC158 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";

export function validateScriptUrl(scriptUrl) {
  const trimmed = String(scriptUrl || "").trim();

  if (!trimmed) {
    throw new Error(EMPTY_SCRIPT_URL_MESSAGE);
  }

  let url;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(INVALID_SCRIPT_URL_MESSAGE);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(INVALID_SCRIPT_PROTOCOL_MESSAGE);
  }

  return url.toString();
}

function makeUrl(scriptUrl, action = "getSessions") {
  const url = new URL(validateScriptUrl(scriptUrl));
  url.searchParams.set("action", action);
  return url.toString();
}

async function readResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    throw new Error(INVALID_RESPONSE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(payload.message || INVALID_SERVER_RESPONSE_MESSAGE);
  }

  if (payload.status && payload.status !== "success") {
    throw new Error(payload.message || REQUEST_FAILED_MESSAGE);
  }

  return payload;
}

async function postAction(scriptUrl, body) {
  const response = await fetch(validateScriptUrl(scriptUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return readResponse(response);
}

function isCloudEnabled(config) {
  return Boolean(config?.enabled && config?.scriptUrl);
}

export async function listSessions(config) {
  if (!isCloudEnabled(config)) {
    return sortSessions(readSessionsLocal());
  }

  const response = await fetch(makeUrl(config.scriptUrl), {
    method: "GET",
  });
  const payload = await readResponse(response);
  return sortSessions(payload.data || []);
}

export async function upsertSession(config, session) {
  if (!isCloudEnabled(config)) {
    const sessions = readSessionsLocal();
    const nextSessions = sortSessions([
      ...sessions.filter((item) => item.id !== session.id),
      session,
    ]);
    writeSessionsLocal(nextSessions);
    return nextSessions;
  }

  await postAction(config.scriptUrl, {
    action: "createSession",
    session,
  });
  return null;
}

export async function deleteSession(config, sessionId) {
  if (!isCloudEnabled(config)) {
    const nextSessions = readSessionsLocal().filter((item) => item.id !== sessionId);
    writeSessionsLocal(nextSessions);
    return nextSessions;
  }

  await postAction(config.scriptUrl, {
    action: "deleteSession",
    sessionId,
  });
  return null;
}

export async function addSignatureBatch(config, sessionIds, signature) {
  if (!isCloudEnabled(config)) {
    const sessions = readSessionsLocal();
    const nextSessions = sessions.map((session) => {
      if (!sessionIds.includes(session.id)) {
        return session;
      }

      const signatures = [...(session.signatures || [])];
      const index = signatures.findIndex((item) => item.staffId === signature.staffId);

      if (index >= 0) {
        signatures[index] = signature;
      } else {
        signatures.push(signature);
      }

      return { ...session, signatures };
    });

    writeSessionsLocal(nextSessions);
    return sortSessions(nextSessions);
  }

  await postAction(config.scriptUrl, {
    action: "addSignatureBatch",
    sessionIds,
    signature,
  });
  return null;
}

export async function removeSignatureBatch(config, sessionIds, staffId) {
  if (!isCloudEnabled(config)) {
    const sessions = readSessionsLocal();
    const nextSessions = sessions.map((session) => {
      if (!sessionIds.includes(session.id)) {
        return session;
      }

      return {
        ...session,
        signatures: (session.signatures || []).filter((item) => item.staffId !== staffId),
      };
    });

    writeSessionsLocal(nextSessions);
    return sortSessions(nextSessions);
  }

  await postAction(config.scriptUrl, {
    action: "removeSignatureBatch",
    sessionIds,
    staffId,
  });
  return null;
}

export async function testScriptUrl(scriptUrl) {
  const response = await fetch(makeUrl(scriptUrl), {
    method: "GET",
  });
  const payload = await readResponse(response);

  if (!Array.isArray(payload.data)) {
    throw new Error(INVALID_SESSION_DATA_MESSAGE);
  }

  return payload.data.length;
}
