export enum CloudProvider {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'AZURE',
}

export enum InstanceStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  PENDING = 'PENDING',
  TERMINATED = 'TERMINATED',
  UNKNOWN = 'UNKNOWN',
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
