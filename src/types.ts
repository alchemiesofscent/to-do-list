export type Priority = 'High' | 'Medium' | 'Low' | 'Aspirational';

export type Domain = 'Writing' | 'Experiments' | 'DH' | 'Grants' | 'Admin';

// Writing subtypes
export type WritingType =
  | 'Article'
  | 'Book'
  | 'Translation'
  | 'Edited Volume'
  | 'Book Review'
  | 'Book Proposal';

// Experiments subtypes
export type ExperimentType =
  | 'Perfume'
  | 'Other Experiment';

// DH subtypes
export type DHType =
  | 'Website'
  | 'Database'
  | 'Other DH';

// Grants subtypes
export type GrantType =
  | 'Management'
  | 'Application'
  | 'Sourcing';

// Admin subtypes
export type AdminType =
  | 'GACR'
  | 'FLU'
  | 'IOCB'
  | 'Internal'
  | 'Other Admin';

export type TaskType =
  | WritingType
  | ExperimentType
  | DHType
  | GrantType
  | AdminType;

export type Status = 
  | 'Published' 
  | 'Complete' 
  | 'Revision' 
  | 'Draft' 
  | 'Early Stage' 
  | 'Experimental' 
  | 'Needs Update'
  | 'Rejected'
  | 'Upcoming';

export interface AcademicTask {
  id: string;
  title: string;
  domain?: Domain;
  type: TaskType;
  priority: Priority;
  status: Status;
  description: string;
  coAuthors?: string;
  deadline?: string;
  deadlineNote?: string;
  isFavorite?: boolean;
  section?: string;
  subsection?: string;
  source?: string;
  updatedAt?: string; // ISO timestamp for sync conflict resolution
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  byType: Record<TaskType, number>;
}
