import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for smooth, flicker-free data loading with optimistic updates
 * Implements stale-while-revalidate pattern to prevent UI flickering
 */
export const useSmoothedData = (
  fetchFunction, 
  dependencies = [], 
  options = {}
) => {
  const {
    pollingInterval = null,
    optimisticUpdate = false,
    preserveOnError = true,
    debounceDelay = 300,
    enableCache = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  const cacheRef = useRef(new Map());
  const timeoutRef = useRef(null);
  const pollingRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Create cache key from dependencies
  const cacheKey = JSON.stringify(dependencies);

  // Debounced fetch function to prevent rapid successive calls
  const debouncedFetch = useCallback(async (showLoading = false) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        // Check cache first
        if (enableCache && cacheRef.current.has(cacheKey)) {
          const cachedData = cacheRef.current.get(cacheKey);
          setData(cachedData);
          setIsStale(true); // Mark as stale, will refresh in background
          setLoading(false);
          setError(null);
        }

        // Show loading only for initial load or when explicitly requested
        if (showLoading && !data) {
          setLoading(true);
        }

        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Fetch fresh data
        const result = await fetchFunction({ 
          signal: abortController.signal 
        });

        // Update cache
        if (enableCache) {
          cacheRef.current.set(cacheKey, result);
        }

        // Update state with smooth transition
        setData(prev => {
          // For optimistic updates, merge with previous data
          if (optimisticUpdate && prev) {
            return { ...prev, ...result };
          }
          return result;
        });

        setError(null);
        setIsStale(false);
        setLoading(false);

      } catch (err) {
        if (err.name === 'AbortError') {
          return; // Request was cancelled, ignore
        }

        console.error('Data fetch error:', err);
        
        // Preserve existing data on error if requested
        if (!preserveOnError) {
          setData(null);
        }
        
        setError(err.message);
        setLoading(false);
        setIsStale(false);
      }
    }, debounceDelay);
  }, [fetchFunction, cacheKey, optimisticUpdate, preserveOnError, enableCache, debounceDelay, data]);

  // Manual refresh function
  const refresh = useCallback((showLoading = false) => {
    // Clear cache for this key
    if (enableCache) {
      cacheRef.current.delete(cacheKey);
    }
    debouncedFetch(showLoading);
  }, [debouncedFetch, cacheKey, enableCache]);

  // Effect for initial load and dependency changes
  useEffect(() => {
    debouncedFetch(true);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  // Effect for polling
  useEffect(() => {
    if (pollingInterval && pollingInterval > 0) {
      pollingRef.current = setInterval(() => {
        debouncedFetch(false); // Background refresh, no loading indicator
      }, pollingInterval);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [pollingInterval, debouncedFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    clearCache: () => cacheRef.current.clear()
  };
};

/**
 * Hook for smooth state transitions with fade effects
 */
export const useSmoothedTransition = (value, delay = 150) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value !== displayValue) {
      setIsTransitioning(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setDisplayValue(value);
        setIsTransitioning(false);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, displayValue, delay]);

  return {
    value: displayValue,
    isTransitioning,
    opacity: isTransitioning ? 0.7 : 1
  };
};

export default useSmoothedData;