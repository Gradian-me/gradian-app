export type ChangeType = 'feature' | 'refactor' | 'add' | 'restore' | 'enhance' | 'update';

export type Priority = 'LOW' | 'Medium' | 'High';

export interface VersionChange {
  changeType: ChangeType;
  description: string;
  priority: Priority;
  affectedDomains: string[];
}

export interface AppVersion {
  id: string;
  timestamp: string;
  version: string; // Format: x.yy.zzz
  changes: VersionChange[];
}

export interface VersionFilters {
  search?: string;
  changeType?: ChangeType | 'all';
  priority?: Priority | 'all';
  domain?: string | 'all';
  sortBy?: 'timestamp' | 'version';
  sortOrder?: 'asc' | 'desc';
}

export type ViewMode = 'grid' | 'list';

