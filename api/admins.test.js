import { beforeEach, describe, expect, it, vi } from "vitest";

const adminState = vi.hoisted(() => ({
  deleteDoc: vi.fn(),
  deleteUser: vi.fn(),
  profileByUid: {},
  verifyIdToken: vi.fn(),
}));

vi.mock("./_lib/firebaseAdmin", () => ({
  getAdminContext: () => ({
    adminAuth: {
      deleteUser: adminState.deleteUser,
      verifyIdToken: adminState.verifyIdToken,
    },
    adminDb: {
      collection: vi.fn(() => ({
        doc: (uid) => ({
          delete: () => adminState.deleteDoc(uid),
          get: async () => {
            const data = adminState.profileByUid[uid];

            return {
              id: uid,
              exists: Boolean(data),
              data: () => data,
            };
          },
        }),
      })),
    },
  }),
}));

import handler from "./admins";

function createResponseRecorder() {
  const result = {
    body: null,
    statusCode: null,
  };

  const response = {
    json(payload) {
      result.body = payload;
      return response;
    },
    status(code) {
      result.statusCode = code;
      return response;
    },
  };

  return { response, result };
}

function createDeleteSelfRequest() {
  return {
    body: { action: "deleteSelf" },
    headers: { authorization: "Bearer test-token" },
    method: "POST",
  };
}

describe("/api/admins handler", () => {
  beforeEach(() => {
    adminState.profileByUid = {};
    adminState.deleteDoc.mockReset();
    adminState.deleteUser.mockReset();
    adminState.verifyIdToken.mockReset();
  });

  it("deletes the current admin account on deleteSelf", async () => {
    adminState.verifyIdToken.mockResolvedValue({
      uid: "admin-2",
      email: "admin2@example.com",
    });
    adminState.profileByUid = {
      "admin-2": {
        email: "admin2@example.com",
        role: "admin",
        schoolId: "B10_2",
        schoolName: "둘리학교",
        status: "active",
      },
    };
    adminState.deleteDoc.mockResolvedValue();
    adminState.deleteUser.mockResolvedValue();

    const { response, result } = createResponseRecorder();

    await handler(createDeleteSelfRequest(), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      data: {
        deletedUid: "admin-2",
        deletedAdminProfile: true,
        deletedAuthUser: true,
      },
    });
    expect(adminState.deleteDoc).toHaveBeenCalledWith("admin-2");
    expect(adminState.deleteUser).toHaveBeenCalledWith("admin-2");
  });

  it("still deletes the auth user when the admin document is already missing", async () => {
    adminState.verifyIdToken.mockResolvedValue({
      uid: "admin-3",
      email: "admin3@example.com",
    });
    adminState.deleteDoc.mockResolvedValue();
    adminState.deleteUser.mockResolvedValue();

    const { response, result } = createResponseRecorder();

    await handler(createDeleteSelfRequest(), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      data: {
        deletedUid: "admin-3",
        deletedAdminProfile: false,
        deletedAuthUser: true,
      },
    });
  });

  it("treats auth user not found as a successful idempotent delete", async () => {
    adminState.verifyIdToken.mockResolvedValue({
      uid: "admin-4",
      email: "admin4@example.com",
    });
    adminState.profileByUid = {
      "admin-4": {
        email: "admin4@example.com",
      },
    };
    adminState.deleteDoc.mockResolvedValue();
    adminState.deleteUser.mockRejectedValue({
      code: "auth/user-not-found",
    });

    const { response, result } = createResponseRecorder();

    await handler(createDeleteSelfRequest(), response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      data: {
        deletedUid: "admin-4",
        deletedAdminProfile: true,
        deletedAuthUser: false,
      },
    });
  });

  it("rejects unsupported methods", async () => {
    adminState.verifyIdToken.mockResolvedValue({
      uid: "admin-2",
      email: "admin2@example.com",
    });

    const { response, result } = createResponseRecorder();

    await handler(
      {
        headers: { authorization: "Bearer test-token" },
        method: "GET",
      },
      response,
    );

    expect(result.statusCode).toBe(405);
    expect(result.body).toEqual({
      message: "허용하지 않는 요청 방식입니다.",
    });
  });
});
