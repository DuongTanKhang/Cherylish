// Admin API traffic stays same-origin so its HttpOnly session cookie can be
// exchanged for a backend bearer token by the server-side Route Handler.
export const apiBaseUrl = "/api/admin";

export async function apiErrorMessage(response: Response, fallback = `API trả về lỗi ${response.status}.`) {
  let message = fallback;
  let errorCode = "";
  let requestId = "";
  try {
    const body = await response.json() as { message?: unknown; errorCode?: unknown; requestId?: unknown };
    if (Array.isArray(body.message)) message = body.message.filter((part): part is string => typeof part === "string").join(" ") || fallback;
    else if (typeof body.message === "string" && body.message.trim()) message = body.message;
    if (typeof body.errorCode === "string") errorCode = body.errorCode;
    if (typeof body.requestId === "string") requestId = body.requestId;
  } catch { /* Non-JSON error response; keep the HTTP fallback. */ }

  const reference = [errorCode ? `Mã lỗi: ${errorCode}` : "", requestId ? `Mã tra cứu: ${requestId}` : ""].filter(Boolean).join(" · ");
  return reference ? `${message} (${reference})` : message;
}

/** Shared HTTP boundary for the future NestJS service. Keep auth secrets server-side. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/${path.replace(/^\//, "")}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return response.json() as Promise<T>;
}
