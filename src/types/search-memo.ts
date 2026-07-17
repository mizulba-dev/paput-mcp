export interface SearchMemoParams {
  query?: string;
  category_id?: number;
  memo_type?: string;
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

export interface MemoType {
  id: number;
  key: string;
}

export type SearchMode = 'filter' | 'hybrid' | 'keyword';

export interface Memo {
  id: number;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  categories: MemoCategory[];
  memo_types: MemoType[];
  score?: number;
}

export interface SearchMemoResponse {
  success: boolean;
  memos?: Memo[];
  total?: number;
  search_mode?: SearchMode;
  error?: string;
}
