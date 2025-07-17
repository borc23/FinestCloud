"""
Cache management service for handling session-specific cache operations.

This module provides a centralized interface for cache operations including
key generation, retrieval, storage, and cleanup operations.
"""

from enum import Enum
from typing import Any, Optional


class CacheKeys(Enum):
    """Enumeration of all cache key types used in the application."""
    IMAGE_SHAPE = "image_shape"
    CUSTOM_MODULE = "custom_module"
    ALL_PANELS = "all_panels"
    MAX_PANELS = "max_panels"
    MODULE = "module"
    RESOLUTION = "resolution"


class CacheManager:
    """Centralized cache management for session data."""
    
    def __init__(self, cache, session_id: str):
        """
        Initialize cache manager with cache instance and session ID.
        
        Args:
            cache: Flask cache instance
            session_id: Current session identifier
        """
        self.cache = cache
        self.session_id = session_id
    
    def get_key(self, cache_type: CacheKeys) -> str:
        """
        Generate a cache key for the given cache type and session.
        
        Args:
            cache_type: Type of cache entry
            
        Returns:
            Formatted cache key string
        """
        return f"{cache_type.value}_{self.session_id}"
    
    def get(self, cache_type: CacheKeys) -> Any:
        """
        Retrieve value from cache for the given cache type.
        
        Args:
            cache_type: Type of cache entry to retrieve
            
        Returns:
            Cached value or None if not found
        """
        return self.cache.get(self.get_key(cache_type))
    
    def set(self, cache_type: CacheKeys, value: Any) -> None:
        """
        Store value in cache for the given cache type.
        
        Args:
            cache_type: Type of cache entry
            value: Value to store
        """
        self.cache.set(self.get_key(cache_type), value)
    
    def delete(self, cache_type: CacheKeys) -> None:
        """
        Delete cache entry for the given cache type.
        
        Args:
            cache_type: Type of cache entry to delete
        """
        self.cache.delete(self.get_key(cache_type))
    
    def clear_all(self) -> None:
        """Clear all cache entries for this session."""
        for cache_type in CacheKeys:
            self.delete(cache_type)
    
    def get_multiple(self, *cache_types: CacheKeys) -> dict[CacheKeys, Any]:
        """
        Retrieve multiple cache values at once.
        
        Args:
            cache_types: Variable number of cache types to retrieve
            
        Returns:
            Dictionary mapping cache types to their values
        """
        return {
            cache_type: self.get(cache_type) 
            for cache_type in cache_types
        }
    
    def set_multiple(self, **values: Any) -> None:
        """
        Set multiple cache values at once.
        
        Args:
            values: Keyword arguments where keys are cache type names and values are the data
        """
        for cache_type_name, value in values.items():
            try:
                cache_type = CacheKeys(cache_type_name)
                self.set(cache_type, value)
            except ValueError:
                # Skip invalid cache type names
                continue
