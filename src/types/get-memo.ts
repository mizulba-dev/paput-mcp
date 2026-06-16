export interface GetMemoParams {
  id: number;
}

export interface GetMemoResponse {
  id: number;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    user_id: string;
    name: string;
    picture: string;
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  memo_types: Array<{
    id: number;
    key: string;
  }>;
  like_count: number;
  has_liked: boolean;
  bookmark_count: number;
  has_bookmarked: boolean;
  projects: Array<{
    id: number;
    title: string;
  }>;
}
