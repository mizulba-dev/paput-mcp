// Note creation parameters
export interface CreateNoteParams {
  title: string;
  is_public?: boolean;
  memos?: Array<{ id: number }>;
}

export interface CreateNoteResponse {
  success: boolean;
  id?: number;
  error?: string;
}

// Note search parameters
export interface SearchNotesParams {
  word?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchNotesResponse {
  success: boolean;
  notes?: Array<{
    id: number;
    title: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    memo_count: number;
  }>;
  total?: number;
  error?: string;
}

// Get note detail parameters
export interface GetNoteParams {
  id: number;
}

export interface GetNoteResponse {
  id: number;
  title: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  memos: Array<{
    id: number;
    title: string;
    body: string;
    is_public: boolean;
    categories: Array<{
      id: number;
      name: string;
    }>;
    created_at: string;
    updated_at: string;
  }>;
}

// Update note parameters
export interface UpdateNoteParams {
  id: number;
  title?: string;
  is_public?: boolean;
  memos?: Array<{ id: number }>;
}

export interface UpdateNoteResponse {
  success: boolean;
  error?: string;
}
