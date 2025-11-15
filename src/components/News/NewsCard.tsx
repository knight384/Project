'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Clock, User, Newspaper } from 'lucide-react';
import { NewsCardProps } from '@/types';
import { clsx } from 'clsx';

export default function NewsCard({ article, onImageError }: NewsCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Reset image states when article changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [article.urlToImage]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    onImageError?.();
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const publishedTimeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

  // Handle bold text from search highlighting
  const formatHighlightedText = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  // Sanitize href attributes
  const sanitizeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '#';
      }
      return url;
    } catch {
      return '#';
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group">
      {/* Article image */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {article.urlToImage && !imageError ? (
          <>
            <Image
              src={article.urlToImage}
              alt={article.title}
              fill
              className={clsx(
                "object-cover transition-transform duration-200 group-hover:scale-105",
                imageLoading && "opacity-0"
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={handleImageError}
              onLoad={handleImageLoad}
              priority={false}
            />
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Newspaper className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
        )}

        {/* Overlay for category badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm text-white rounded-full">
            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
          </span>
        </div>
      </div>

      {/* Article content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {article.title}
        </h3>

        {/* Description */}
        <p
          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: formatHighlightedText(article.description)
          }}
        />

        {/* Article metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]" title={article.author}>
              {article.author}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{publishedTimeAgo}</span>
          </div>
        </div>

        {/* Source info and link */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
            {article.source.name}
          </span>

          <a
            href={sanitizeUrl(article.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            title="Read full article"
          >
            <span className="hidden sm:inline">Read more</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
}