import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { assertFirebaseConfigured, db } from "./firebase";

const SEARCH_ENDPOINT = import.meta.env.VITE_SCHOOL_SEARCH_ENDPOINT || "/api/schools";

function publicSchoolDocRef(schoolId) {
  return doc(db, "schools", schoolId);
}

function privateSchoolDocRef(schoolId) {
  return doc(db, "schoolPrivate", schoolId);
}

function adminDocRef(uid) {
  return doc(db, "admins", uid);
}

function normalizeSchoolId(value) {
  return String(value || "").trim();
}

function normalizeSchoolConfig(id, publicData = {}, privateData = null, options = {}) {
  const { includePrivate = false } = options;
  const fallbackLegacyStaff = Array.isArray(publicData.defaultStaffCache) ? publicData.defaultStaffCache : [];
  const privateStaff = Array.isArray(privateData?.defaultStaffCache) ? privateData.defaultStaffCache : null;

  return {
    id,
    schoolId: id,
    schoolName: publicData.schoolName || "",
    officeName: publicData.officeName || "",
    officeCode: publicData.officeCode || "",
    schoolCode: publicData.schoolCode || "",
    schoolKind: publicData.schoolKind || "",
    address: publicData.address || "",
    homepage: publicData.homepage || "",
    gasWebAppUrl: publicData.gasWebAppUrl || "",
    enabled: Boolean(publicData.enabled || publicData.gasWebAppUrl),
    defaultStaffCache: includePrivate ? privateStaff || fallbackLegacyStaff : [],
  };
}

function normalizeAdminProfile(id, data = {}) {
  return {
    id,
    uid: id,
    email: data.email || "",
    displayName: data.displayName || "",
    schoolId: data.schoolId || "",
    schoolName: data.schoolName || "",
    role: data.role || "admin",
    status: data.status || "pending_setup",
  };
}

function buildSchoolSummary(school) {
  return {
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    officeCode: school.officeCode || "",
    officeName: school.officeName || "",
    schoolCode: school.schoolCode || "",
    schoolKind: school.schoolKind || "",
    address: school.address || "",
    homepage: school.homepage || "",
  };
}

export async function searchSchools(query, signal) {
  const keyword = String(query || "").trim();

  if (keyword.length < 2) {
    return [];
  }

  const response = await fetch(`${SEARCH_ENDPOINT}?query=${encodeURIComponent(keyword)}`, {
    method: "GET",
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "학교 검색에 실패했습니다.");
  }

  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function readAdminProfile(uid) {
  assertFirebaseConfigured();
  const snapshot = await getDoc(adminDocRef(uid));
  return snapshot.exists() ? normalizeAdminProfile(snapshot.id, snapshot.data()) : null;
}

export function subscribeToAdminProfile(uid, callback) {
  assertFirebaseConfigured();
  return onSnapshot(adminDocRef(uid), (snapshot) => {
    callback(snapshot.exists() ? normalizeAdminProfile(snapshot.id, snapshot.data()) : null);
  });
}

export async function readSchoolConfigById(schoolId, options = {}) {
  assertFirebaseConfigured();

  const normalizedId = normalizeSchoolId(schoolId);
  const { includePrivate = false } = options;

  if (!normalizedId) {
    return null;
  }

  const publicSnapshot = await getDoc(publicSchoolDocRef(normalizedId));

  if (!publicSnapshot.exists()) {
    return null;
  }

  if (!includePrivate) {
    return normalizeSchoolConfig(publicSnapshot.id, publicSnapshot.data(), null, { includePrivate: false });
  }

  const privateSnapshot = await getDoc(privateSchoolDocRef(normalizedId));

  return normalizeSchoolConfig(
    publicSnapshot.id,
    publicSnapshot.data(),
    privateSnapshot.exists() ? privateSnapshot.data() : null,
    { includePrivate: true },
  );
}

export function subscribeToSchoolConfig(schoolId, callback, options = {}) {
  assertFirebaseConfigured();

  const normalizedId = normalizeSchoolId(schoolId);
  const { includePrivate = true } = options;

  if (!normalizedId) {
    callback(null);
    return () => {};
  }

  let publicData = null;
  let privateData = null;

  const emit = () => {
    if (!publicData) {
      callback(null);
      return;
    }

    callback(normalizeSchoolConfig(normalizedId, publicData, privateData, { includePrivate }));
  };

  const unsubscribePublic = onSnapshot(publicSchoolDocRef(normalizedId), (snapshot) => {
    publicData = snapshot.exists() ? snapshot.data() : null;
    emit();
  });

  if (!includePrivate) {
    return () => {
      unsubscribePublic();
    };
  }

  const unsubscribePrivate = onSnapshot(privateSchoolDocRef(normalizedId), (snapshot) => {
    privateData = snapshot.exists() ? snapshot.data() : null;
    emit();
  });

  return () => {
    unsubscribePublic();
    unsubscribePrivate();
  };
}

export async function ensureSchoolRecord(school) {
  assertFirebaseConfigured();

  const summary = buildSchoolSummary(school);

  await setDoc(
    publicSchoolDocRef(summary.schoolId),
    {
      ...summary,
      enabled: false,
      gasWebAppUrl: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return summary.schoolId;
}

export async function saveAdminProfile(user, school, existingProfile = null) {
  assertFirebaseConfigured();

  const summary = buildSchoolSummary(school);

  await setDoc(
    adminDocRef(user.uid),
    {
      uid: user.uid,
      email: user.email || existingProfile?.email || "",
      displayName: user.displayName || existingProfile?.displayName || "",
      schoolId: existingProfile?.schoolId || summary.schoolId,
      schoolName: existingProfile?.schoolName || summary.schoolName,
      role: existingProfile?.role || "admin",
      status: existingProfile?.status || "pending_setup",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateAdminStatus(uid, status) {
  assertFirebaseConfigured();

  await setDoc(
    adminDocRef(uid),
    {
      status,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveSchoolConfig(schoolId, updates) {
  assertFirebaseConfigured();

  const normalizedId = normalizeSchoolId(schoolId);
  const payload = {
    ...updates,
    defaultStaffCache: deleteField(),
    updatedAt: serverTimestamp(),
  };

  if (Object.prototype.hasOwnProperty.call(updates, "gasWebAppUrl")) {
    payload.enabled = Boolean(updates.gasWebAppUrl);
  }

  await setDoc(
    publicSchoolDocRef(normalizedId),
    payload,
    { merge: true },
  );
}

export async function saveDefaultStaffCache(schoolId, staffList) {
  const normalizedId = normalizeSchoolId(schoolId);

  await Promise.all([
    setDoc(
      privateSchoolDocRef(normalizedId),
      {
        defaultStaffCache: Array.isArray(staffList) ? staffList : [],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      publicSchoolDocRef(normalizedId),
      {
        defaultStaffCache: deleteField(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
}
