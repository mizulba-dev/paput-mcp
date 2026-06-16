export interface CreateMemoParams {
  title: string;
  body: string;
  is_public?: boolean;
  created_at?: string;
  categories?: Array<{ id?: number; name: string }>;
  memo_type_keys?: string[];
  projects?: Array<{ id: number; title?: string }>;
}

export interface CreateMemoResponse {
  success: boolean;
  id?: number;
  error?: string;
}

export interface CreateMemosParams {
  memos: CreateMemoParams[];
}

export interface CreateMemosResponse {
  success: boolean;
  created_count: number;
  failed_count: number;
  created: Array<{
    index: number;
    id?: number;
    title: string;
  }>;
  failed: Array<{
    index: number;
    title?: string;
    error: string;
  }>;
  error?: string;
}
