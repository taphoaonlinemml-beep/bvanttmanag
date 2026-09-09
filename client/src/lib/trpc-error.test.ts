import { describe, expect, it } from "vitest";
import { isTransientGatewayError } from "./trpc-error";

describe("isTransientGatewayError", () => {
  it("recognizes the non-JSON HTML response returned by a transient gateway timeout", () => {
    expect(isTransientGatewayError(new Error("Unexpected token '<', \"<html>\" is not valid JSON"))).toBe(true);
    expect(isTransientGatewayError(new Error("HTTP 504 Gateway Time-out"))).toBe(true);
  });

  it("does not retry ordinary API or validation errors", () => {
    expect(isTransientGatewayError(new Error("Xã/phường không hợp lệ"))).toBe(false);
  });
});
