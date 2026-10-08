export interface Webhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface PagingInfo {
  pages: { current: number; last: number };
  results: { total: number; limitation: number };
}

export interface WebhookList {
  data: Webhook[];
  paging: PagingInfo;
}

export interface MeResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

/** Server error envelope — fixed shape per the API contract. */
export interface ApiErrorBody {
  error: {
    type: string;
    message: string;
    payload: Record<string, string[]> | null;
  };
}

export type ValidationErrors = Record<string, string[] | undefined>;
