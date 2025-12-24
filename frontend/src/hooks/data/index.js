/**
 * Data Hooks
 *
 * Hooks for managing data loading, caching, and modal data.
 */

// Data fetching with caching
export {
  useDataQuery,
  invalidateQuery,
  invalidateAllQueries,
  prefetchQuery,
  getQueryData,
  setQueryData
} from './useDataQuery';

// Modal data management
export { useModalData, useMultiModalData } from '../useModalData';

// Page error handling
export { usePageError, extractErrorMessage } from '../usePageError';
