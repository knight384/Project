export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string; // truncated
  author: string;
  source: {
    name: string;
    id: string;
  };
  publishedAt: string; // ISO 8601
  url: string;
  urlToImage: string;
  category: 'general' | 'business' | 'technology' | 'entertainment' | 'sports' | 'health';
}

export interface NewsFeed {
  articles: NewsArticle[];
  category: string;
  totalResults: number;
  lastUpdated: Date;
}

export interface NewsFeedProps {
  articles: NewsArticle[];
  loading?: boolean;
  error?: string;
  category?: string;
  onCategoryChange?: (category: string) => void;
  onRefresh?: () => void;
}

export interface NewsCardProps {
  article: NewsArticle;
  onImageError?: () => void;
}

export const NEWS_CATEGORIES = [
  'general',
  'business',
  'technology',
  'entertainment',
  'sports',
  'health'
] as const;

export type NewsCategory = typeof NEWS_CATEGORIES[number];