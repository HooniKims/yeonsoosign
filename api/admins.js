import { getAdminContext } from "./_lib/firebaseAdmin";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildError(response, status, message) {
  response.status(status).json({ message });
}

function readBearerToken(request) {
  const authHeader = request.headers?.authorization || request.headers?.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw createHttpError(401, "로그인이 필요합니다.");
  }

  return authHeader.slice("Bearer ".length);
}

function readRequestBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return request.body;
}

function isIgnorableDeleteError(error) {
  return error?.code === "auth/user-not-found";
}

async function getRequesterContext(request) {
  const token = readBearerToken(request);
  const { adminAuth, adminDb } = getAdminContext();
  const decodedToken = await adminAuth.verifyIdToken(token);
  const adminSnapshot = await adminDb.collection("admins").doc(decodedToken.uid).get();

  return {
    adminAuth,
    adminDb,
    decodedToken,
    hasAdminProfile: adminSnapshot.exists,
  };
}

async function deleteOwnAccount(response, context) {
  const { adminAuth, adminDb, decodedToken, hasAdminProfile } = context;

  const [docResult, userResult] = await Promise.allSettled([
    adminDb.collection("admins").doc(decodedToken.uid).delete(),
    adminAuth.deleteUser(decodedToken.uid),
  ]);

  if (docResult.status === "rejected") {
    throw docResult.reason;
  }

  if (userResult.status === "rejected" && !isIgnorableDeleteError(userResult.reason)) {
    throw userResult.reason;
  }

  response.status(200).json({
    data: {
      deletedUid: decodedToken.uid,
      deletedAdminProfile: hasAdminProfile,
      deletedAuthUser: userResult.status === "fulfilled",
    },
  });
}

export default async function handler(request, response) {
  try {
    const context = await getRequesterContext(request);

    if (request.method === "POST") {
      const body = readRequestBody(request);

      if (body.action === "deleteSelf") {
        await deleteOwnAccount(response, context);
        return;
      }

      throw createHttpError(400, "지원하지 않는 관리자 요청입니다.");
    }

    throw createHttpError(405, "허용하지 않는 요청 방식입니다.");
  } catch (error) {
    buildError(response, error.status || 500, error.message || "관리자 요청 처리에 실패했습니다.");
  }
}
