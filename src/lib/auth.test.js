import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAuthMocks = vi.hoisted(() => ({
  EmailAuthProvider: {
    credential: vi.fn(),
  },
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
}));

const firebaseConfigMocks = vi.hoisted(() => ({
  auth: { currentUser: null, name: "auth-instance" },
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

import {
  changeAdminPassword,
  completeAdminOnboarding,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "./auth";

describe("auth flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseConfigMocks.assertFirebaseConfigured.mockImplementation(() => {});
    firebaseConfigMocks.auth.currentUser = null;
  });

  it("returns onboarding state when email login has no admin profile", async () => {
    const user = {
      uid: "admin-1",
      email: "admin@example.com",
      providerData: [{ providerId: "password" }],
    };

    firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({ user });
    schoolMocks.readAdminProfile.mockResolvedValue(null);

    const result = await signInWithEmail({
      email: "admin@example.com",
      password: "password",
    });

    expect(result).toMatchObject({
      user,
      profile: null,
      needsSignup: true,
      needsSchoolSelection: false,
      canUpdatePassword: true,
    });
    expect(firebaseAuthMocks.signOut).not.toHaveBeenCalled();
  });

  it("creates membership data during email signup", async () => {
    const user = {
      uid: "admin-2",
      email: "admin@example.com",
      displayName: "",
      providerData: [{ providerId: "password" }],
    };
    const school = {
      schoolId: "B10_7010569",
      schoolName: "테스트고등학교",
    };

    firebaseAuthMocks.createUserWithEmailAndPassword.mockResolvedValue({ user });
    firebaseAuthMocks.updateProfile.mockResolvedValue();
    schoolMocks.ensureSchoolRecord.mockResolvedValue();
    schoolMocks.saveAdminProfile.mockResolvedValue();
    schoolMocks.readAdminProfile.mockResolvedValue({
      uid: "admin-2",
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      status: "pending_setup",
    });

    const result = await signUpWithEmail({
      displayName: "관리자",
      email: "admin@example.com",
      password: "password",
      school,
    });

    expect(result).toMatchObject({
      user,
      profile: expect.objectContaining({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      }),
      needsSignup: false,
      needsSchoolSelection: false,
    });
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
      providerData: [{ providerId: "google.com" }],
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

  it("returns onboarding state when Google login has no admin profile", async () => {
    const user = {
      uid: "admin-4",
      email: "admin@example.com",
      displayName: "관리자",
      providerData: [{ providerId: "google.com" }],
    };

    firebaseAuthMocks.signInWithPopup.mockResolvedValue({ user });
    schoolMocks.readAdminProfile.mockResolvedValue(null);

    const result = await signInWithGoogle({ mode: "login" });

    expect(result).toMatchObject({
      user,
      profile: null,
      needsSignup: true,
      needsSchoolSelection: false,
      canUpdatePassword: false,
    });
  });

  it("completes onboarding for the current user without reopening login", async () => {
    const user = {
      uid: "admin-5",
      email: "admin@example.com",
      displayName: "관리자",
      providerData: [{ providerId: "google.com" }],
    };
    const school = {
      schoolId: "B10_7010569",
      schoolName: "테스트고등학교",
    };

    firebaseConfigMocks.auth.currentUser = user;
    schoolMocks.readAdminProfile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        uid: "admin-5",
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        status: "pending_setup",
      });
    schoolMocks.ensureSchoolRecord.mockResolvedValue();
    schoolMocks.saveAdminProfile.mockResolvedValue();

    const result = await completeAdminOnboarding({ school });

    expect(result).toMatchObject({
      user,
      profile: expect.objectContaining({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      }),
      needsSignup: false,
      needsSchoolSelection: false,
    });
    expect(schoolMocks.ensureSchoolRecord).toHaveBeenCalledWith(school);
    expect(schoolMocks.saveAdminProfile).toHaveBeenCalledWith(user, school, null);
  });

  it("changes password after reauthentication for email/password admins", async () => {
    const user = {
      uid: "admin-6",
      email: "admin@example.com",
      providerData: [{ providerId: "password" }],
    };

    firebaseConfigMocks.auth.currentUser = user;
    firebaseAuthMocks.EmailAuthProvider.credential.mockReturnValue("credential");
    firebaseAuthMocks.reauthenticateWithCredential.mockResolvedValue();
    firebaseAuthMocks.updatePassword.mockResolvedValue();

    await changeAdminPassword({
      currentPassword: "old-password",
      nextPassword: "new-password",
    });

    expect(firebaseAuthMocks.EmailAuthProvider.credential).toHaveBeenCalledWith(
      "admin@example.com",
      "old-password",
    );
    expect(firebaseAuthMocks.reauthenticateWithCredential).toHaveBeenCalledWith(user, "credential");
    expect(firebaseAuthMocks.updatePassword).toHaveBeenCalledWith(user, "new-password");
  });

  it("rejects password changes for Google-only accounts", async () => {
    firebaseConfigMocks.auth.currentUser = {
      uid: "admin-7",
      email: "admin@example.com",
      providerData: [{ providerId: "google.com" }],
    };

    await expect(
      changeAdminPassword({
        currentPassword: "old-password",
        nextPassword: "new-password",
      }),
    ).rejects.toThrow("Google 로그인 계정은 비밀번호 변경 대상이 아닙니다.");

    expect(firebaseAuthMocks.reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(firebaseAuthMocks.updatePassword).not.toHaveBeenCalled();
  });
});
