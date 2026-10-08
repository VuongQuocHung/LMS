import type { ErrorBody, User } from "./types";

// Không lưu session/token vào localStorage. Session nằm trong cookie HttpOnly.
const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 10_000;

interface CsrfToken {
  headerName: string;
  token: string;
}

/** Giữ HTTP status và fieldErrors để giao diện phân biệt lỗi phiên với lỗi nhập liệu. */
export class ApiError extends Error {
  constructor(public status: number, public body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
  }
}

/** Đọc response; lỗi proxy có thể là HTML nên không giả định mọi lỗi đều là JSON. */
async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, {
      code: body?.code ?? "HTTP_ERROR",
      message: body?.message ?? "Không thể kết nối API. Kiểm tra backend và thử lại.",
      fieldErrors: body?.fieldErrors ?? {},
    });
  }
  return body as T;
}

/** Gửi request có timeout và không cache dữ liệu riêng của tài khoản. */
async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(API_PREFIX + path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return await readResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Mất kết nối hoặc quá thời gian chờ. Thao tác có thể đã được server xử lý; hãy tải lại để kiểm tra.");
  }
}

/** Lấy token mới trước mỗi mutation, tránh giữ token cũ sau login/logout. */
async function csrfHeaders(): Promise<Record<string, string>> {
  const csrf = await send<CsrfToken>("/auth/csrf");
  return { [csrf.headerName]: csrf.token };
}

/** Gọi API JSON; không tự retry mutation vì kết quả khi timeout có thể chưa rõ. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const tokenHeaders = await csrfHeaders();
    Object.entries(tokenHeaders).forEach(([name, value]) => headers.set(name, value));
  }
  return send<T>(path, { ...options, method, headers });
}

/** Spring formLogin nhận form-urlencoded; các API nghiệp vụ khác nhận JSON. */
export async function login(email: string, password: string): Promise<User> {
  const headers = await csrfHeaders();
  await send<void>("/auth/login", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: email.trim().toLowerCase(), password }),
  });
  // Đăng nhập làm token cũ mất hiệu lực; mutation kế tiếp sẽ lấy token mới.
  return api<User>("/auth/me");
}

/** Kết thúc session phía server trước khi xóa thông tin user khỏi giao diện. */
export async function logout(): Promise<void> {
  await api<void>("/auth/logout", { method: "POST" });
}

/** Biến lỗi bất kỳ thành chuỗi an toàn để hiển thị. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = Object.values(error.body.fieldErrors).join(" ");
    return details || error.message;
  }
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
}

/** Phiên hết hạn/tài khoản bị khóa cần quay về màn hình đăng nhập. */
export function isSessionError(error: unknown): boolean {
  return error instanceof ApiError &&
    (error.status === 401 || error.body.code === "ACCOUNT_DISABLED");
}
