export interface Service {
  id: number;
  name: string;
  hourly_rate: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceInput {
  name: string;
  hourly_rate: number;
  active: boolean;
}
