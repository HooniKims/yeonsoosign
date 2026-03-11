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

    const { response, result } = createResponseRecorder();

    await handler(
      {
        body: { action: "deleteSelf" },
        headers: { authorization: "Bearer test-token" },
        method: "POST",
      },
      response,
    );

    expect(result.statusCode).toBe(200);
    expect(adminState.deleteDoc).toHaveBeenCalledWith("admin-2");
    expect(adminState.deleteUser).toHaveBeenCalledWith("admin-2");
  });

  it("rejects unsupported methods", async () => {
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
      message: "허용되지 않은 요청 방식입니다.",
    });
  });
});
