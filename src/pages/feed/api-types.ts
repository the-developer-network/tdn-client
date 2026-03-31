export interface ProfileData {
    username: string;
    fullName: string;
    avatarUrl: string;
}


export type PostType = 'SYSTEM_UPDATE' | 'COMMUNITY' | 'JOB_POSTING' | 'TECH_NEWS';


export interface PostAuthor {
  id: string;
  username: string;
  avatarUrl: string;
}


export interface Post {
  id: string;
  content: string;
  type: PostType;
  mediaUrls: string[];
  createdAt: string; 
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  author: PostAuthor;
}

export interface MediaUploadResponse {
  data: {
    mediaUrls: string[];
  };
  meta: {
    timestamp: string;
  };
}

