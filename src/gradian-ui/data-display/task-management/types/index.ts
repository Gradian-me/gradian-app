export type AssignmentView = 'assignedTo' | 'initiatedBy' | 'allItems';

export interface AssignmentUser {
  id: string;
  label: string;
  subtitle?: string;
  avatarUrl?: string;
}

export interface AssignmentCounts {
  assignedTo: number;
  initiatedBy: number;
  allItems: number;
}

export interface AssignmentFilterResult<T = any> {
  filteredEntities: T[];
  counts: AssignmentCounts;
}
