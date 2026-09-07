export interface TimeEntry {
  id: number;
  user_id: number;
  service_id: number;
  service_name?: string;
  work_date: string;
  hours: number;
  description: string;
  hourly_rate: number;
  user_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimeEntryInput {
  service_id: number;
  work_date: string;
  hours: number;
  description: string;
}
