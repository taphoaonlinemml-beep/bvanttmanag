import { describe, expect, it } from "vitest";
import { canCreateDeletionRequest, resolveDeletionRequest } from "./deletion-requests";

describe("deletion request workflow", () => {
  it("allows a new request only when there is no pending request for the personnel record", () => {
    expect(canCreateDeletionRequest([])).toBe(true);
    expect(canCreateDeletionRequest(["rejected", "executed"])).toBe(true);
    expect(canCreateDeletionRequest(["pending"])).toBe(false);
  });

  it("moves a pending request to rejected or executed and blocks repeat decisions", () => {
    expect(resolveDeletionRequest("pending", "reject")).toBe("rejected");
    expect(resolveDeletionRequest("pending", "execute")).toBe("executed");
    expect(() => resolveDeletionRequest("rejected", "execute")).toThrow("Yêu cầu không còn ở trạng thái chờ xử lý");
    expect(() => resolveDeletionRequest("executed", "reject")).toThrow("Yêu cầu không còn ở trạng thái chờ xử lý");
  });
});
