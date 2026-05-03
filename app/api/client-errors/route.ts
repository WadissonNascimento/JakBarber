import { NextResponse } from "next/server";

type ClientErrorPayload = {
  message?: string;
  stack?: string;
  digest?: string;
  path?: string;
  userAgent?: string;
  source?: string;
};

export async function POST(request: Request) {
  let payload: ClientErrorPayload = {};

  try {
    payload = (await request.json()) as ClientErrorPayload;
  } catch {
    payload = { message: "Invalid client error payload" };
  }

  console.error(
    "[client-error]",
    JSON.stringify({
      at: new Date().toISOString(),
      source: payload.source || "unknown",
      path: payload.path || null,
      message: payload.message || null,
      digest: payload.digest || null,
      stack: payload.stack || null,
      userAgent: payload.userAgent || null,
    })
  );

  return NextResponse.json({ ok: true });
}
