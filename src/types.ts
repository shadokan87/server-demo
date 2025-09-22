export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface DatabaseStatus {
  connected: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  connectionAttempts: number;
  uptime: number;
}

export interface ConnectionLossConfig {
  enabled: boolean;
  failureRate: number; // 0-1 probability
  minInterval: number; // minimum ms between failures
  maxInterval: number; // maximum ms between failures
  recoveryTime: number; // ms to recover
}

export enum FailureType {
  TIMEOUT = 'TIMEOUT',
  CORRUPTION = 'CORRUPTION',
  LOCK = 'LOCK',
  DISK_FULL = 'DISK_FULL',
  PERMISSION = 'PERMISSION'
}

export interface DatabaseError extends Error {
  type: FailureType;
  code?: string;
  errno?: number;
}
