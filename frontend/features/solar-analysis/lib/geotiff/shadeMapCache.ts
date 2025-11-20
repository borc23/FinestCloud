/**
 * Shade Map Cache Manager
 * Manages caching of GeoTIFF shade maps for performance
 */

import { GeoTIFFParser } from './geotiffParser'

interface CacheEntry {
  parser: GeoTIFFParser
  timestamp: number
  url: string
}

export class ShadeMapCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cacheTTL: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  private maxCacheSize: number = 50 // Maximum number of cached shade maps

  /**
   * Get or load a shade map parser
   */
  async getParser(url: string): Promise<GeoTIFFParser> {
    const cacheKey = this.getCacheKey(url)

    // Check if cached and valid
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.parser
    }

    // Load new parser
    const parser = new GeoTIFFParser()
    await parser.loadFromUrl(url)

    // Store in cache
    this.cache.set(cacheKey, {
      parser,
      timestamp: Date.now(),
      url,
    })

    // Clean up old entries if cache is too large
    this.cleanupCache()

    return parser
  }

  /**
   * Preload multiple shade maps (useful for hourly shade URLs)
   */
  async preloadParsers(urls: string[]): Promise<void> {
    const loadPromises = urls.map(url => this.getParser(url))
    await Promise.all(loadPromises)
  }

  /**
   * Get cache key for URL
   */
  private getCacheKey(url: string): string {
    // Use URL as cache key (could hash for shorter keys)
    return url
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const age = Date.now() - timestamp
    return age < this.cacheTTL
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return
    }

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    )

    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, this.cache.size - this.maxCacheSize)
    for (const [key] of entriesToRemove) {
      this.cache.delete(key)
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Clear cache for specific URL
   */
  clearUrl(url: string): void {
    const cacheKey = this.getCacheKey(url)
    this.cache.delete(cacheKey)
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; urls: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      urls: Array.from(this.cache.values()).map(entry => entry.url),
    }
  }
}

// Export singleton instance
export const shadeMapCache = new ShadeMapCache()
