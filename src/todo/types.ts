export type TodoStep = {
  id: string;
  title: string;
  completed: boolean;
};

export type TodoTask = {
  id: string;
  title: string;
  completed: boolean;
  isImportant: boolean;
  dueDate: string | null; // YYYY-MM-DD
  note: string;
  steps: TodoStep[];
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  deletedAt?: string | null; // ISO8601 (tombstone)
};

