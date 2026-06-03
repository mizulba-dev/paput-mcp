export interface SearchMemoParams {
  word?: string;
  category_id?: number;
  ids?: number[];
  date?: string;
  is_public?: boolean;
  project_id?: number;
  page?: number;
  limit?: number;
}

export interface MemoCategory {
  id: number;
  name: string;
}

export interface Memo {
  id: number;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  categories: MemoCategory[];
}

export interface SearchMemoResponse {
  success: boolean;
  memos?: Memo[];
  total?: number;
  error?: string;
}
