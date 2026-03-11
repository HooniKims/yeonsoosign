import { describe, expect, it } from "vitest";
import { validateScriptUrl } from "./sessions";

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
