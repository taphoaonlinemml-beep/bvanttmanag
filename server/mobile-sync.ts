import { Router, type Request } from "express";
import * as db from "./db";

type MobileSyncDependencies = {
  findActiveToken?: typeof db.findActiveMobileSyncToken;
  touchToken?: typeof db.touchMobileSyncToken;
  getSnapshot?: typeof db.getMobileSyncSnapshot;
  createLog?: typeof db.createMobileSyncLog;
};

function parseToken(req: Request) {
  const match = (req.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function requestedWardId(value: unknown) {
  if (value === undefined) return null;
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) throw new Error("wardId không hợp lệ");
  return Number(value);
}

function requestMetadata(req: Request) {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: (forwarded || req.ip || req.socket.remoteAddress || null)?.slice(0, 64) ?? null,
    userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
  };
}

export function createMobileSyncRouter(dependencies: MobileSyncDependencies = {}) {
  const router = Router();
  const findActiveToken = dependencies.findActiveToken ?? db.findActiveMobileSyncToken;
  const touchToken = dependencies.touchToken ?? db.touchMobileSyncToken;
  const getSnapshot = dependencies.getSnapshot ?? db.getMobileSyncSnapshot;
  const createLog = dependencies.createLog ?? db.createMobileSyncLog;

  router.get("/v1/health", async (req, res) => {
    const rawToken = parseToken(req);
    const token = rawToken ? await findActiveToken(rawToken) : null;
    if (!token) return res.status(401).json({ error: "unauthorized" });
    await touchToken(token.id);
    return res.status(200).json({ status: "ok" });
  });

  router.get("/v1/personnel", async (req, res) => {
    const rawToken = parseToken(req);
    const token = rawToken ? await findActiveToken(rawToken) : null;
    if (!token) return res.status(401).json({ error: "unauthorized" });
    try {
      const requested = requestedWardId(req.query.wardId);
      const wardId = token.wardId ?? requested;
      const metadata = requestMetadata(req);
      if (token.wardId && requested && requested !== token.wardId) {
        await createLog({ tokenId: token.id, wardId, statusCode: 403, unitCount: 0, personnelCount: 0, errorCode: "forbidden", ...metadata });
        return res.status(403).json({ error: "forbidden" });
      }
      const snapshot = await getSnapshot(wardId);
      await touchToken(token.id);
      await createLog({ tokenId: token.id, wardId, statusCode: 200, unitCount: snapshot.units.length, personnelCount: snapshot.personnel.length, ...metadata });
      return res.status(200).json({ version: 1, generatedAt: new Date().toISOString(), ...snapshot });
    } catch (error) {
      await createLog({ tokenId: token.id, wardId: token.wardId, statusCode: 400, unitCount: 0, personnelCount: 0, errorCode: "invalid_request", ...requestMetadata(req) });
      return res.status(400).json({ error: "invalid_request", message: error instanceof Error ? error.message : "Yêu cầu không hợp lệ" });
    }
  });
  return router;
}
