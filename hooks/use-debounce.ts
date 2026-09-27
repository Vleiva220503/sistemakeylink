import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of `value` that only updates after
 * `delay` ms of inactivity. Use this to wrap search inputs before
 * feeding them into expensive useMemo filters.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 250)
 * const filtered = useMemo(() => items.filter(...), [debouncedSearch, items])
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
