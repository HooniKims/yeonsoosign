import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

import { parseStaffFile } from "./staff";

function createTextFile(name, text) {
  return {
    name,
    text: async () => text,
  };
}

describe("parseStaffFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("removes an English header row from csv input", async () => {
    const file = createTextFile(
      "staff.csv",
      [
        "Department,Name",
        "행정실,김연수",
        "교사,홍길동",
      ].join("\n"),
    );

    const result = await parseStaffFile(file);

    expect(result).toHaveLength(2);
    expect(result.map((item) => `${item.department}/${item.name}`)).toEqual([
      "행정실/김연수",
      "교사/홍길동",
    ]);
  });

  it("removes a BOM-prefixed Korean header row from txt input", async () => {
    const file = createTextFile(
      "staff.txt",
      [
        "\uFEFF직위\t성명",
        "교사\t홍길동",
        "행정실\t김연수",
      ].join("\n"),
    );

    const result = await parseStaffFile(file);

    expect(result).toHaveLength(2);
    expect(result.map((item) => `${item.department}/${item.name}`)).toEqual([
      "교사/홍길동",
      "행정실/김연수",
    ]);
  });

  it("falls back to the default department for one-column input", async () => {
    const file = createTextFile(
      "staff.txt",
      [
        "홍길동",
        "김연수",
      ].join("\n"),
    );

    const result = await parseStaffFile(file);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.department)).toEqual(["교직원", "교직원"]);
    expect(result.map((item) => item.name)).toEqual(["홍길동", "김연수"]);
  });
});
