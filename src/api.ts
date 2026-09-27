import { apiUrl, type Config } from "./config";

export interface ApiErrorShape {
  error: { code: string; message: string };
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & ApiErrorShape;
  if (!res.ok) {
    const err = data?.error;
    throw new ApiRequestError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? res.statusText);
  }
  return data;
}

export async function api<T>(
  config: Config,
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  const res = await fetch(`${apiUrl(config)}${path}`, { ...init, headers });
  return parse<T>(res);
}

export interface PairStart {
  sessionId: string;
  code: string;
  expiresAt: string;
  qrPayload: string;
}

export interface PairSession {
  status: "pending" | "linked" | "expired";
  sessionId: string;
  deviceId?: string;
  token?: string;
  deviceName?: string;
  cliName?: string;
  expiresAt?: string;
}

export interface ClaimResult {
  deviceId: string;
  token: string;
  cliName: string;
}
