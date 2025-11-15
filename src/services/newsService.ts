import { NewsArticle, NEWS_CATEGORIES, NewsError } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_NEWS_BASE_URL;

if (!API_KEY || !BASE_URL) {
  console.warn('NewsAPI.org credentials not found in environment variables');
}

class NewsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private validateImageUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private transformArticle(article: any, category: string): NewsArticle {
    return {
      id: article.url || `news-${Date.now()}-${Math.random()}`,
      title: article.title || 'Untitled',
      description: article.description || '',
      content: article.content || article.description || '',
      author: article.author || 'Unknown',
      source: {
        name: article.source?.name || 'Unknown Source',
        id: article.source?.id || 'unknown',
      },
      publishedAt: article.publishedAt || new Date().toISOString(),
      url: article.url || '#',
      urlToImage: this.validateImageUrl(article.urlToImage) ? article.urlToImage : '',
      category: category as any,
    };
  }

  private filterDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.title.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async getTopHeadlines(category?: string, country: string = 'us'): Promise<NewsArticle[]> {
    if (!API_KEY || !BASE_URL) {
      throw new NewsError('News API configuration error', 401);
    }

    const validCategory = category && NEWS_CATEGORIES.includes(category as any) ? category : 'general';
    const cacheKey = `headlines_${validCategory}_${country}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        apiKey: API_KEY,
        country: country,
        category: validCategory,
        pageSize: '20',
      });

      const response = await this.fetchWithRetry(`${BASE_URL}/top-headlines?${params}`);

      if (!response.ok) {
        if (response.status === 400) {
          throw new NewsError('Invalid category parameters', 400);
        } else if (response.status === 401) {
          throw new NewsError('Invalid API key', 401);
        } else if (response.status === 429) {
          throw new NewsError('Rate limit exceeded', 429);
        } else {
          throw new NewsError('News data unavailable', response.status);
        }
      }

      const data = await response.json();

      // Filter out articles without images
      const articlesWithImages = (data.articles || []).filter((article: any) =>
        this.validateImageUrl(article.urlToImage)
      );

      const transformedArticles = articlesWithImages
        .map((article: any) => this.transformArticle(article, validCategory))
        .filter((article: any) => article.title !== '[Removed]') // Filter out removed articles
        .sort((a: NewsArticle, b: NewsArticle) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

      const uniqueArticles = this.filterDuplicates(transformedArticles);
      const limitedArticles = uniqueArticles.slice(0, 20); // Ensure we don't exceed requested amount

      this.setCachedData(cacheKey, limitedArticles);
      return limitedArticles;
    } catch (error) {
      if (error instanceof NewsError) {
        throw error;
      }

      if (error instanceof Error && (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT'))) {
        throw new NewsError('News service temporarily unavailable', 503);
      }

      throw new NewsError('Failed to fetch news articles', 500);
    }
  }

  async searchNews(query: string, category?: string): Promise<NewsArticle[]> {
    if (!API_KEY || !BASE_URL) {
      throw new NewsError('News API configuration error', 401);
    }

    if (!query || query.trim().length < 2) {
      throw new NewsError('Search query must be at least 2 characters', 400);
    }

    const validCategory = category && NEWS_CATEGORIES.includes(category as any) ? category : null;
    const cacheKey = `search_${encodeURIComponent(query.trim())}_${validCategory || 'all'}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        apiKey: API_KEY,
        q: query.trim(),
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: '20',
      });

      if (validCategory) {
        params.append('category', validCategory);
      }

      const response = await this.fetchWithRetry(`${BASE_URL}/everything?${params}`);

      if (!response.ok) {
        if (response.status === 400) {
          throw new NewsError('Invalid search parameters', 400);
        } else if (response.status === 401) {
          throw new NewsError('Invalid API key', 401);
        } else if (response.status === 429) {
          throw new NewsError('Rate limit exceeded', 429);
        } else {
          throw new NewsError('News search unavailable', response.status);
        }
      }

      const data = await response.json();

      // Filter out articles without images
      const articlesWithImages = (data.articles || []).filter((article: any) =>
        this.validateImageUrl(article.urlToImage)
      );

      const transformedArticles = articlesWithImages
        .map((article: any) => this.transformArticle(article, validCategory || 'general'))
        .filter((article: any) => article.title !== '[Removed]')
        .map((article: any) => ({
          ...article,
          // Highlight search terms in title/description (basic implementation)
          title: this.highlightSearchTerms(article.title, query),
          description: this.highlightSearchTerms(article.description, query),
        }));

      const uniqueArticles = this.filterDuplicates(transformedArticles);

      this.setCachedData(cacheKey, uniqueArticles);
      return uniqueArticles;
    } catch (error) {
      if (error instanceof NewsError) {
        throw error;
      }
      throw new NewsError('Failed to search news', 500);
    }
  }

  async getCategories(): Promise<string[]> {
    return NEWS_CATEGORIES;
  }

  private highlightSearchTerms(text: string, query: string): string {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
  }
}

export const newsService = new NewsService();