export interface WeightEntry {
  id: number;
  entry_date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface StatsResponse {
  count: number;
  min: { weight_kg: number; entry_date: string } | null;
  max: { weight_kg: number; entry_date: string } | null;
  average: number | null;
  latest: { weight_kg: number; entry_date: string } | null;
  delta: number | null;
  average_last_month: number | null;
  average_previous_month: number | null;
  average_last_quarter: number | null;
  average_previous_quarter: number | null;
  average_last_year: number | null;
  average_previous_year: number | null;
}
