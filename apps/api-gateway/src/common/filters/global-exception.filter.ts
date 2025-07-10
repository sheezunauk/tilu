import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../../audit/audit.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private auditService: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || 'Unknown error',
      error: status >= 500 ? 'Internal Server Error' : 'Client Error',
      requestId: this.generateRequestId(),
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : 'No stack trace',
    );

    if (status >= 500) {
      this.auditService.logAction({
        userId: (request as any).user?.id || 'anonymous',
        userRole: (request as any).user?.role || 'unknown',
        action: 'SYSTEM_ERROR',
        resource: 'system',
        details: {
          error: errorResponse.message,
          path: request.url,
          method: request.method,
          statusCode: status,
        },
        ipAddress: request.ip || 'unknown',
        userAgent: request.get('User-Agent') || 'unknown',
        branchId: (request as any).user?.branchId,
      });
    }

    response.status(status).json(errorResponse);
  }

  private generateRequestId(): string {
    return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
