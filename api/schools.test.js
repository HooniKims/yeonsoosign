import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./schools";

function createResponseRecorder() {
  const result = {
    body: null,
    headers: {},
    statusCode: null,
  };

  const response = {
    json(payload) {
      result.body = payload;
      return response;
    },
    setHeader(name, value) {
      result.headers[name] = value;
      return response;
    },
    status(code) {
      result.statusCode = code;
      return response;
    },
  };

  return { response, result };
}

describe("/api/schools handler", () => {
  const originalApiKey = process.env.NEIS_API_KEY;

  beforeEach(() => {
    process.env.NEIS_API_KEY = "test-neis-key";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.NEIS_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects non-GET requests", async () => {
    const { response, result } = createResponseRecorder();

    await handler({ method: "POST", query: {} }, response);

    expect(result.statusCode).toBe(405);
    expect(result.body).toEqual({
      message: "GET 요청만 허용됩니다.",
    });
  });

  it("returns empty data for short queries without calling NEIS", async () => {
    const { response, result } = createResponseRecorder();

    await handler({ method: "GET", query: { query: "가" } }, response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ data: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("normalizes NEIS school rows", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        schoolInfo: [
          {
            head: [
              {
                RESULT: {
                  CODE: "INFO-000",
                  MESSAGE: "정상 처리되었습니다.",
                },
              },
            ],
          },
          {
            row: [
              {
                ATPT_OFCDC_SC_CODE: "B10",
                ATPT_OFCDC_SC_NM: "서울특별시교육청",
                SD_SCHUL_CODE: "7010569",
                SCHUL_NM: "테스트고등학교",
                SCHUL_KND_SC_NM: "고등학교",
                ORG_RDNMA: "서울특별시 어딘가 1",
                HMPG_ADRES: "https://school.example.com",
              },
            ],
          },
        ],
      }),
    });

    const { response, result } = createResponseRecorder();

    await handler({ method: "GET", query: { query: "테스트" } }, response);

    expect(result.statusCode).toBe(200);
    expect(result.headers["Cache-Control"]).toBe("s-maxage=43200, stale-while-revalidate=86400");
    expect(result.body).toEqual({
      data: [
        {
          address: "서울특별시 어딘가 1",
          homepage: "https://school.example.com",
          officeCode: "B10",
          officeName: "서울특별시교육청",
          schoolCode: "7010569",
          schoolId: "B10_7010569",
          schoolKind: "고등학교",
          schoolName: "테스트고등학교",
        },
      ],
    });

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl.toString()).toContain("KEY=test-neis-key");
    expect(calledUrl.toString()).toContain("SCHUL_NM=%ED%85%8C%EC%8A%A4%ED%8A%B8");
  });

  it("returns an empty list for INFO-200", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        RESULT: {
          CODE: "INFO-200",
          MESSAGE: "해당하는 데이터가 없습니다.",
        },
      }),
    });

    const { response, result } = createResponseRecorder();

    await handler({ method: "GET", query: { query: "없는학교" } }, response);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ data: [] });
  });
});
