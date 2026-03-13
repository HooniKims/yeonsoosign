import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth, assertFirebaseConfigured, googleProvider } from "./firebase";
import {
  ensureSchoolRecord,
  readAdminProfile,
  saveAdminProfile,
} from "./schools";

const PASSWORD_PROVIDER_ID = "password";

const AUTH_ERROR_MESSAGES = {
  "auth/account-exists-with-different-credential": "이미 다른 로그인 방식으로 가입된 계정입니다.",
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호를 다시 확인해 주세요.",
  "auth/invalid-email": "올바른 이메일 주소를 입력해 주세요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해 주세요.",
  "auth/popup-blocked": "팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.",
  "auth/popup-closed-by-user": "로그인 팝업이 닫혔습니다.",
  "auth/requires-recent-login": "보안을 위해 다시 로그인한 뒤 시도해 주세요.",
  "auth/too-many-requests": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "auth/user-not-found": "등록되지 않은 관리자 계정입니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/wrong-password": "이메일 또는 비밀번호를 다시 확인해 주세요.",
};

function getErrorMessage(error, fallback) {
  return AUTH_ERROR_MESSAGES[error?.code] || error?.message || fallback;
}

function getProviderIds(user) {
  const providerIds = new Set(
    Array.isArray(user?.providerData)
      ? user.providerData.map((item) => item?.providerId).filter(Boolean)
      : [],
  );

  if (!providerIds.size && user?.providerId) {
    providerIds.add(user.providerId);
  }

  return Array.from(providerIds);
}

function hasCompleteSchoolProfile(profile) {
  return Boolean(profile?.schoolId && profile?.schoolName);
}

function buildAuthResult(user, profile) {
  return {
    user,
    profile,
    needsSignup: !profile,
    needsSchoolSelection: Boolean(profile && !hasCompleteSchoolProfile(profile)),
    providerIds: getProviderIds(user),
    canUpdatePassword: canUpdateAdminPassword(user),
  };
}

async function resolveAdminAuth(user) {
  const profile = await readAdminProfile(user.uid);
  return buildAuthResult(user, profile);
}

function getAuthenticatedUser() {
  assertFirebaseConfigured();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user;
}

async function registerAdminMembership(user, school, existingProfile = null) {
  if (!school) {
    throw new Error("학교를 검색 결과에서 선택해 주세요.");
  }

  if (existingProfile?.schoolId && existingProfile.schoolId !== school.schoolId) {
    throw new Error("이미 다른 학교에 연결된 관리자 계정입니다.");
  }

  await ensureSchoolRecord(school);
  await saveAdminProfile(user, school, existingProfile);
}

export function subscribeToAuthState(callback) {
  assertFirebaseConfigured();
  return onAuthStateChanged(auth, callback);
}

export function canUpdateAdminPassword(user) {
  return getProviderIds(user).includes(PASSWORD_PROVIDER_ID);
}

export async function signInWithEmail({ email, password }) {
  assertFirebaseConfigured();

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return await resolveAdminAuth(credential.user);
  } catch (error) {
    throw new Error(getErrorMessage(error, "로그인에 실패했습니다."));
  }
}

export async function signUpWithEmail({ displayName, email, password, school }) {
  assertFirebaseConfigured();

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
      await updateProfile(credential.user, {
        displayName,
      });
    }

    await registerAdminMembership(
      {
        ...credential.user,
        displayName: displayName || credential.user.displayName || "",
      },
      school,
    );

    return await resolveAdminAuth(credential.user);
  } catch (error) {
    throw new Error(getErrorMessage(error, "회원가입에 실패했습니다."));
  }
}

export async function signInWithGoogle({ mode, school }) {
  assertFirebaseConfigured();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const existingProfile = await readAdminProfile(result.user.uid);

    if (mode === "signup") {
      await registerAdminMembership(result.user, school, existingProfile);
      return await resolveAdminAuth(result.user);
    }

    return buildAuthResult(result.user, existingProfile);
  } catch (error) {
    throw new Error(getErrorMessage(error, error?.message || "Google 로그인에 실패했습니다."));
  }
}

export async function completeAdminOnboarding({ school }) {
  try {
    const user = getAuthenticatedUser();
    const existingProfile = await readAdminProfile(user.uid);

    await registerAdminMembership(user, school, existingProfile);

    return await resolveAdminAuth(user);
  } catch (error) {
    throw new Error(getErrorMessage(error, "관리자 가입 처리에 실패했습니다."));
  }
}

export async function changeAdminPassword({ currentPassword, nextPassword }) {
  const user = getAuthenticatedUser();

  if (!canUpdateAdminPassword(user)) {
    throw new Error("Google 로그인 계정은 비밀번호 변경 대상이 아닙니다.");
  }

  if (!user.email) {
    throw new Error("이메일 정보가 없는 계정입니다.");
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, nextPassword);
  } catch (error) {
    throw new Error(getErrorMessage(error, "비밀번호 변경에 실패했습니다."));
  }
}

export async function signOutAdmin() {
  assertFirebaseConfigured();
  await signOut(auth);
}
