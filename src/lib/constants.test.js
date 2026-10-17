import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { APPS_SCRIPT_SNIPPET } from "./constants";

function server(contents = []) {
  const setContent = vi.fn();
  const createFile = vi.fn();
  let locked = false;
  const lock = {
    waitLock: vi.fn(() => { locked = true; }),
    hasLock: () => locked,
    releaseLock: vi.fn(() => { locked = false; }),
  };
  const context = vm.createContext({
    LockService: { getScriptLock: () => lock },
    DriveApp: {
      getFilesByName: () => {
        let index = 0;
        return {
          hasNext: () => index < contents.length,
          next: () => {
            const raw = contents[index++];
            return { getBlob: () => ({ getDataAsString: () => raw }), setContent };
          },
        };
      },
      createFile,
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (value) => ({ setMimeType: () => JSON.parse(value) }),
    },
  });
  vm.runInContext(APPS_SCRIPT_SNIPPET, context);
  return { context, lock, setContent, createFile };
}

describe("Apps Script database protection", () => {
  it.each(["", "   ", '{"sessions":[', "null", "{}"])(
    "rejects damaged storage without overwriting it: %j", (raw) => {
      const { context, lock, setContent, createFile } = server([raw]);
      const result = context.handleAction("createSession", { session: { id: "new" } });
      expect(result.status).toBe("error");
      expect(result.message).toContain("연수 저장 파일");
      expect(setContent).not.toHaveBeenCalled();
      expect(createFile).not.toHaveBeenCalled();
      expect(lock.releaseLock).toHaveBeenCalledOnce();
    },
  );

  it("rejects ambiguous duplicate files", () => {
    const { context } = server(['{"sessions":[]}', '{"sessions":[]}']);
    expect(context.doGet({}).message).toContain("여러 개");
  });

  it("returns existing sessions and releases the lock", () => {
    const { context, lock } = server(['{"sessions":[{"id":"existing"}]}']);
    expect(context.doGet({})).toEqual({ status: "success", data: [{ id: "existing" }] });
    expect(lock.releaseLock).toHaveBeenCalledOnce();
  });

  it("allows a first write when no database file exists", () => {
    const { context, createFile } = server();
    expect(context.handleAction("createSession", { session: { id: "new" } }).status).toBe("success");
    expect(createFile).toHaveBeenCalledWith("TrainingRegister_DB.json", '{"sessions":[{"id":"new"}]}');
  });

  it("returns a JSON error for a malformed POST", () => {
    const { context } = server();
    expect(context.doPost({ postData: { contents: "{" } }).status).toBe("error");
  });
});
