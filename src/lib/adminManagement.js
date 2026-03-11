import { auth, assertFirebaseConfigured } from "./firebase";

const ADMIN_API_ENDPOINT = import.meta.env.VITE_ADMIN_API_ENDPOINT || "/api/admins";

async function getAuthToken() {
  assertFirebaseConfigured();

  const user = auth?.currentUser;

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user.getIdToken();
}

async function requestAdminApi(path = "", options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${ADMIN_API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "관리자 요청 처리에 실패했습니다.");
  }

  return payload?.data ?? null;
}

export async function deleteOwnAdminAccount() {
  return requestAdminApi("", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "deleteSelf",
    }),
  });
}
