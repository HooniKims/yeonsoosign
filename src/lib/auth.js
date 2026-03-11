import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, assertFirebaseConfigured, googleProvider } from "./firebase";
import {
  ensureSchoolRecord,
  readAdminProfile,
  saveAdminProfile,
} from "./schools";

const AUTH_ERROR_MESSAGES = {
  "auth/account-exists-with-different-credential": "이미 다른 로그인 방식으로 가입된 계정입니다.",
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호를 다시 확인해 주세요.",
  "auth/invalid-email": "올바른 이메일 주소를 입력해 주세요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/popup-blocked": "팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.",
  "auth/popup-closed-by-user": "로그인 팝업이 닫혔습니다.",
  "auth/too-many-requests": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "auth/user-not-found": "등록되지 않은 관리자 계정입니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/wrong-password": "이메일 또는 비밀번호를 다시 확인해 주세요.",
};

function getErrorMessage(error, fallback) {
  return AUTH_ERROR_MESSAGES[error?.code] || error?.message || fallback;
}

async function ensureAdminAccess(user) {
  const profile = await readAdminProfile(user.uid);

  if (!profile) {
    await signOut(auth);
    throw new Error("관리자 가입이 완료되지 않은 계정입니다. 먼저 회원가입을 진행해 주세요.");
  }

  return profile;
}

async function registerAdminMembership(user, school, existingProfile = null) {
  if (!school) {
    throw new Error("학교를 검색 결과에서 선택해 주세요.");
  }

  if (existingProfile && existingProfile.schoolId !== school.schoolId) {
    throw new Error("이미 다른 학교에 연결된 관리자 계정입니다.");
  }

  await ensureSchoolRecord(school);
  await saveAdminProfile(user, school, existingProfile);
}

export function subscribeToAuthState(callback) {
  assertFirebaseConfigured();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail({ email, password }) {
  assertFirebaseConfigured();

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureAdminAccess(credential.user);
    return credential.user;
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

    return credential.user;
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
      return result.user;
    }

    if (!existingProfile) {
      await signOut(auth);
      throw new Error("구글 계정이 아직 관리자 가입되지 않았습니다. 먼저 회원가입을 진행해 주세요.");
    }

    return result.user;
  } catch (error) {
    throw new Error(getErrorMessage(error, error?.message || "Google 로그인에 실패했습니다."));
  }
}

export async function signOutAdmin() {
  assertFirebaseConfigured();
  await signOut(auth);
}
