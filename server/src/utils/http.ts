import type { Response } from "express";

export function ok(res: Response, data: unknown = {}) {
  return res.json({
    code: 0,
    message: "success",
    data,
    traceId: buildTraceId(),
  });
}

export function fail(res: Response, status: number, code: number, message: string, data: unknown = {}) {
  return res.status(status).json({
    code,
    message,
    data,
    traceId: buildTraceId(),
  });
}

function buildTraceId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(16).slice(2, 8);
  return `${date}-${random}`;
}
