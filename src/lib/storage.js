import {
  DEFAULT_CLOUD_CONFIG,
  DEFAULT_POSITION_ORDER,
  STORAGE_KEYS,
} from "./constants";

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function readSessionsLocal() {
  return parseJson(localStorage.getItem(STORAGE_KEYS.sessions), []);
}

export function writeSessionsLocal(sessions) {
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
}

export function sortSessions(sessions) {
  return [...sessions].toSorted((left, right) => {
    const rightStamp = right.createdAt ?? 0;
    const leftStamp = left.createdAt ?? 0;
    return rightStamp - leftStamp;
  });
}

export function readStaffList() {
  return parseJson(localStorage.getItem(STORAGE_KEYS.staffList), []);
}

export function writeStaffList(staffList) {
  localStorage.setItem(STORAGE_KEYS.staffList, JSON.stringify(staffList));
}

export function readCloudConfig() {
  return {
    ...DEFAULT_CLOUD_CONFIG,
    ...parseJson(localStorage.getItem(STORAGE_KEYS.cloudConfig), DEFAULT_CLOUD_CONFIG),
  };
}

export function writeCloudConfig(config) {
  localStorage.setItem(STORAGE_KEYS.cloudConfig, JSON.stringify(config));
}

export function readGoogleClientId() {
  return localStorage.getItem(STORAGE_KEYS.googleClientId) || "";
}

export function writeGoogleClientId(value) {
  if (!value) {
    localStorage.removeItem(STORAGE_KEYS.googleClientId);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.googleClientId, value);
}

export function readLastSchool() {
  return localStorage.getItem(STORAGE_KEYS.lastSchool) || "";
}

export function writeLastSchool(value) {
  if (!value) {
    localStorage.removeItem(STORAGE_KEYS.lastSchool);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.lastSchool, value);
}

export function readSortOrder() {
  const stored = parseJson(localStorage.getItem(STORAGE_KEYS.sortOrder), DEFAULT_POSITION_ORDER);
  return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_POSITION_ORDER;
}

export function writeSortOrder(order) {
  localStorage.setItem(STORAGE_KEYS.sortOrder, JSON.stringify(order));
}
