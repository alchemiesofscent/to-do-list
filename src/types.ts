export type Priority = 'High' | 'Medium' | 'Low' | 'Aspirational';

export type Domain = 'Writing' | 'Experiments' | 'DH' | 'Grants' | 'Admin';

export type TaskType =
  | 'Article'
  | 'Book'
  | 'Translation'
  | 'Edited Volume'
  | 'Book Review'
  | 'Digital Humanities'
  | 'Grant'
  | 'Book Proposal'
  | 'Experiment'
  | 'Admin Task';

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
