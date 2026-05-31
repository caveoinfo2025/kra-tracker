export type MobileLead = {
  id: number;
  title: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  stage: string;
  expectedValue: number;
  source: string;
  categoryName: string;
  oemName: string;
  remarks: string;
  updatedAt: string;
  createdAt: string;
  assignedTo?: { id: number; name: string } | null;
  _count?: { tasks: number; meetings: number; notes: number };
};
