export function isTransientGatewayError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("Unexpected token '<'") || /\b(502|503|504)\b/.test(message);
}
