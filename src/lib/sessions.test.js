import { afterEach, describe, expect, it, vi } from "vitest";
import { listSessions, validateScriptUrl } from "./sessions";

afterEach(() => vi.unstubAllGlobals());

describe("cloud list responses", () => {
  const config = { enabled: true, scriptUrl: "https://example.com/exec" };

  it("explains the observed Apps Script database parse error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "error", message: "SyntaxError: Unexpected end of JSON input",
    }))));
    await expect(listSessions(config)).rejects.toThrow("TrainingRegister_DB.json");
  });

  it.each(["", "null", '{"status":"success","data":{}}', '{"status":"success"}'])(
    "rejects an invalid response instead of showing an empty list: %s", async (body) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
      await expect(listSessions(config)).rejects.toThrow();
    },
  );

  it("accepts a valid empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"status":"success","data":[]}')));
    await expect(listSessions(config)).resolves.toEqual([]);
  });
});

describe("validateScriptUrl", () => {
  it("trims and normalizes a valid http url", () => {
    expect(validateScriptUrl(" https://example.com/path?x=1 ")).toBe("https://example.com/path?x=1");
  });

  it("rejects an empty value", () => {
    expect(() => validateScriptUrl("   ")).toThrow("앱스 스크립트 Web App URL을 입력해 주세요.");
  });

  it("rejects a non-http protocol", () => {
    expect(() => validateScriptUrl("ftp://example.com/test")).toThrow(
      "URL은 http:// 또는 https://로 시작해야 합니다.",
    );
  });
});
