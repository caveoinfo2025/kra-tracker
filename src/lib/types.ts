/** Serialized types (Date fields become strings after JSON.parse(JSON.stringify(...))) */

export type WeeklyCommitSerialized = {
  id: number;
  kraId: number;
  employeeId: number;
  week: number;
  year: number;
  commitText: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewSerialized = {
  id: number;
  kraId: number;
  employeeId: number;
  week: number;
  year: number;
  progress: number;
  score: number;
  notes: string;
  blockers: string;
  createdAt: string;
};

export type KRASerialized = {
  id: number;
  employeeId: number;
  title: string;
  description: string;
  target: string;
  deadline: string;
  weight: number;
  status: string;
  createdAt: string;
  reviews: ReviewSerialized[];
};

export type EmployeeSerialized = {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  createdAt: string;
  kras: KRASerialized[];
};
