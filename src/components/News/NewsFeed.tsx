'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Filter, TrendingUp } from 'lucide-react';
import { NewsFeedProps } from '@/types';
import { NEWS_CATEGORIES } from '@/types/news';
import { clsx } from 'clsx';
import NewsCard from './NewsCard';

const CATEGORIES_WITH_ALL = ['All', ...NEWS_CATEGORIES];

export default function NewsFeed({
  articles,
  loading,
  error,
  category = 'general',
  onCategoryChange,
  onRefresh
}: NewsFeedProps) {
  const [activeCategory, setActiveCategory] = useState(category);
  const [refreshDisabled, setRefreshDisabled] = useState(false);

  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, []);

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === activeCategory) return;

    setActiveCategory(newCategory);
    onCategoryChange?.(newCategory === 'All' ? 'general' : newCategory);

    // Store category preference
    try {
      localStorage.setItem('preferredNewsCategory', newCategory);
    } catch (error) {
      console.warn('Failed to store category preference:', error);
    }
  };

  const handleRefresh = () => {
    if (refreshDisabled || loading) return;

    setRefreshDisabled(true);
    onRefresh?.();

    setTimeout(() => {
      setRefreshDisabled(false);
    }, 2000);
  };

  if (loading && !articles?.length) {
    return (
      <div className="space-y-6">
        {/* Category tabs skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>

        {/* News cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trending News</h2>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Failed to load news</h3>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshDisabled}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayArticles = articles || [];

  return (
    <div className="space-y-6">
      {/* Header with title and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trending News</h2>
          {displayArticles.length > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {displayArticles.length}
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshDisabled || loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh news"
        >
          <RefreshCw className={clsx(
            "w-4 h-4",
            loading && "animate-spin"
          )} />
          Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES_WITH_ALL.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                activeCategory === cat || (activeCategory === 'general' && cat === 'All')
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles grid */}
      {displayArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayArticles.map((article, index) => (
            <NewsCard
              key={`${article.id}-${index}`}
              article={article}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <TrendingUp className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No articles found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try selecting a different category or check back later for updates.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshDisabled}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )
      )}

      {/* Auto-refresh indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        News auto-refreshes every 30 minutes
      </div>
    </div>
  );
}