export type Role = "ADMIN" | "SENIOR_MANAGER" | "HR_RECRUITER" | "EMPLOYEE" | "CANDIDATE";

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
  first_name?: string;
  last_name?: string;
  profile_photo?: string | null;
  employee_profile?: {
    id: number;
    employee_id: string;
    full_name: string;
  };
  candidate_profile?: {
    id: number;
    name: string;
  };
};

export type MetricCard = {
  label: string;
  value: string | number;
  delta?: string;
};
