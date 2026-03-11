import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAuthMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

const firebaseConfigMocks = vi.hoisted(() => ({
  auth: { name: "auth-instance" },
  assertFirebaseConfigured: vi.fn(),
  googleProvider: { providerId: "google.com" },
}));

const schoolMocks = vi.hoisted(() => ({
  ensureSchoolRecord: vi.fn(),
  readAdminProfile: vi.fn(),
  saveAdminProfile: vi.fn(),
}));

vi.mock("firebase/auth", () => firebaseAuthMocks);
vi.mock("./firebase", () => firebaseConfigMocks);
vi.mock("./schools", () => schoolMocks);

import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "./auth";

describe("auth flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseConfigMocks.assertFirebaseConfigured.mockImplementation(() => {});
  });

  it("preserves the custom error when email login has no admin profile", async () => {
    firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "admin-1",
      },
    });
    schoolMocks.readAdminProfile.mockResolvedValue(null);
    firebaseAuthMocks.signOut.mockResolvedValue();

    await expect(
      signInWithEmail({
        email: "admin@example.com",
        password: "password",
      }),
    ).rejects.toThrow("관리자 가입이 완료되지 않은 계정입니다. 먼저 회원가입을 진행해 주세요.");

    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith(firebaseConfigMocks.auth);
  });

  it("creates membership data during email signup", async () => {
    const user = {
      uid: "admin-2",
      email: "admin@example.com",
      displayName: "",
    };
    const school = {
      schoolId: "B10_7010569",
      schoolName: "테스트고등학교",
    };

    firebaseAuthMocks.createUserWithEmailAndPassword.mockResolvedValue({ user });
    firebaseAuthMocks.updateProfile.mockResolvedValue();
    schoolMocks.ensureSchoolRecord.mockResolvedValue();
    schoolMocks.saveAdminProfile.mockResolvedValue();

    const result = await signUpWithEmail({
      displayName: "관리자",
      email: "admin@example.com",
      password: "password",
      school,
    });

    expect(result).toBe(user);
    expect(firebaseAuthMocks.updateProfile).toHaveBeenCalledWith(user, {
      displayName: "관리자",
    });
    expect(schoolMocks.ensureSchoolRecord).toHaveBeenCalledWith(school);
    expect(schoolMocks.saveAdminProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "admin-2",
        email: "admin@example.com",
        displayName: "관리자",
      }),
      school,
      null,
    );
  });

  it("blocks Google signup when the account is already linked to another school", async () => {
    const user = {
      uid: "admin-3",
      email: "admin@example.com",
      displayName: "관리자",
    };

    firebaseAuthMocks.signInWithPopup.mockResolvedValue({ user });
    schoolMocks.readAdminProfile.mockResolvedValue({
      schoolId: "C10_1234567",
      schoolName: "기존학교",
    });

    await expect(
      signInWithGoogle({
        mode: "signup",
        school: {
          schoolId: "B10_7010569",
          schoolName: "새학교",
        },
      }),
    ).rejects.toThrow("이미 다른 학교에 연결된 관리자 계정입니다.");

    expect(schoolMocks.ensureSchoolRecord).not.toHaveBeenCalled();
    expect(schoolMocks.saveAdminProfile).not.toHaveBeenCalled();
  });
});
