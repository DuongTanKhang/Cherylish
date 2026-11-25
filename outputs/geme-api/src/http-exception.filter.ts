import { randomUUID } from "node:crypto";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

type HttpRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type HttpResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: unknown): unknown };
};

const prismaMessages: Record<string, { status: number; message: string }> = {
  P1001: { status: HttpStatus.SERVICE_UNAVAILABLE, message: "Không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau." },
  P1002: { status: HttpStatus.SERVICE_UNAVAILABLE, message: "Cơ sở dữ liệu phản hồi quá chậm. Vui lòng thử lại sau." },
  P2000: { status: HttpStatus.BAD_REQUEST, message: "Một giá trị nhập quá dài so với giới hạn của dữ liệu." },
  P2002: { status: HttpStatus.CONFLICT, message: "Mã phiếu hoặc SKU đã tồn tại. Kiểm tra lại mã hàng rồi thử lại." },
  P2003: { status: HttpStatus.CONFLICT, message: "Dữ liệu liên kết đã thay đổi hoặc không còn hợp lệ. Tải lại danh sách rồi thử lại." },
  P2025: { status: HttpStatus.NOT_FOUND, message: "Không tìm thấy dữ liệu cần cập nhật. Tải lại trang rồi thử lại." },
  P2028: { status: HttpStatus.GATEWAY_TIMEOUT, message: "Giao dịch nhập kho quá thời gian xử lý. Kiểm tra danh sách phiếu trước khi gửi lại." },
  P2034: { status: HttpStatus.CONFLICT, message: "Dữ liệu kho vừa được cập nhật ở nơi khác. Tải lại tồn kho rồi thử lại." },
};

function redactDiagnostic(value: string) {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "postgresql://[REDACTED]")
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,]+/gi, "$1[REDACTED]")
    .replace(/((?:password|token|secret|api[_-]?key)\s*["']?\s*[:=]\s*["']?)[^\s,"']+/gi, "$1[REDACTED]");
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const incomingRequestId = request.headers?.["x-request-id"];
    const requestId = typeof incomingRequestId === "string" && /^[a-zA-Z0-9._:-]{8,100}$/.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();
    const error = exception instanceof Error ? exception : new Error(String(exception));
    const rawErrorCode = typeof (exception as { code?: unknown } | null)?.code === "string"
      ? String((exception as { code: string }).code)
      : error.name || "INTERNAL_ERROR";
    const prismaCode = /^P\d{4}$/.test(rawErrorCode) ? rawErrorCode : null;
    const route = request.originalUrl || request.url || "unknown";
    const isReceiptSave = request.method === "POST" && /\/inventory\/receipts(?:\?|$)/.test(route);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = isReceiptSave
      ? "Không thể lưu phiếu nhập do lỗi máy chủ. Gửi mã tra cứu cho hỗ trợ để xem lỗi cụ thể."
      : "Máy chủ gặp lỗi khi xử lý yêu cầu. Gửi mã tra cứu cho hỗ trợ để xem lỗi cụ thể.";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      const bodyMessage = typeof body === "string" ? body : (body as { message?: unknown })?.message;
      if (typeof bodyMessage === "string") message = bodyMessage;
      else if (Array.isArray(bodyMessage)) message = bodyMessage.filter((part): part is string => typeof part === "string").join(" ") || exception.message;
      else message = exception.message;
      if (status >= 500) {
        message = isReceiptSave
          ? "Không thể lưu phiếu nhập do lỗi máy chủ. Gửi mã tra cứu cho hỗ trợ để xem lỗi cụ thể."
          : "Máy chủ gặp lỗi khi xử lý yêu cầu. Gửi mã tra cứu cho hỗ trợ để xem lỗi cụ thể.";
      }
    } else if (prismaCode && prismaMessages[prismaCode]) {
      status = prismaMessages[prismaCode].status;
      message = prismaMessages[prismaCode].message;
    } else if (error.name === "PrismaClientValidationError") {
      status = HttpStatus.BAD_REQUEST;
      message = "Dữ liệu phiếu nhập chưa đúng định dạng. Kiểm tra SKU, danh mục, biến thể và số liệu.";
    }

    const errorCode = prismaCode || (exception instanceof HttpException ? `HTTP_${status}` : rawErrorCode);

    const detail = redactDiagnostic(error.message || error.name).slice(0, 4000);
    const stack = error.stack ? redactDiagnostic(error.stack).slice(0, 12000) : undefined;
    this.logger.error(JSON.stringify({
      event: "http.request_failed",
      requestId,
      method: request.method || "UNKNOWN",
      path: route.split("?", 1)[0],
      status,
      errorCode,
      errorName: error.name,
      detail,
    }), stack);

    response.setHeader("X-Request-Id", requestId);
    return response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      requestId,
    });
  }
}
