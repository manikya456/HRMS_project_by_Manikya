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
    department?: string;
    designation?: string;
    status?: string;
    joining_date?: string;
    phone?: string;
    address?: string;
    salary?: string;
    manager?: {
      id: number;
      employee_id: string;
      full_name: string;
    } | null;
  };
  candidate_profile?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    applied_position?: {
      id: number;
      title: string;
    } | null;
  };
};

export type MetricCard = {
  label: string;
  value: string | number;
  delta?: string;
};
