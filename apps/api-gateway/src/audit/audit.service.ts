import { Injectable } from '@nestjs/common';

export interface AuditLog {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  branchId?: string;
}

@Injectable()
export class AuditService {
  private auditLogs: AuditLog[] = [];

  async logAction(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...auditData,
      timestamp: new Date(),
    };

    this.auditLogs.push(auditLog);

    console.log('AUDIT LOG:', {
      user: `${auditData.userId} (${auditData.userRole})`,
      action: auditData.action,
      resource: auditData.resource,
      timestamp: auditLog.timestamp.toISOString(),
    });

    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action));
      }
      if (filters.resource) {
        logs = logs.filter(log => log.resource === filters.resource);
      }
      if (filters.branchId) {
        logs = logs.filter(log => log.branchId === filters.branchId);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getSecurityAlerts(): Promise<Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }>> {
    const recentLogs = this.auditLogs.filter(
      log => log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }> = [];

    const failedLogins = recentLogs.filter(log => 
      log.action === 'LOGIN_FAILED'
    ).length;

    if (failedLogins > 10) {
      alerts.push({
        type: 'SECURITY_ALERT',
        severity: 'HIGH',
        message: `${failedLogins} failed login attempts in the last 24 hours`,
        timestamp: new Date(),
      });
    }

    const suspiciousActions = recentLogs.filter(log => 
      log.action.includes('DELETE') || log.action.includes('MODIFY_CRITICAL')
    );

    if (suspiciousActions.length > 20) {
      alerts.push({
        type: 'SECURITY_ALERT',
        severity: 'MEDIUM',
        message: `High number of critical actions (${suspiciousActions.length}) detected`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}
