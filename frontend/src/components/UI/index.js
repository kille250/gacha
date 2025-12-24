/**
 * App-Specific UI Components
 *
 * This module exports ONLY app-specific components that are unique to this application.
 *
 * For design-system primitives, import directly from design-system:
 * @example
 * import { Button, Modal, LoadingState, Container } from '../design-system';
 *
 * For app-specific components:
 * @example
 * import { MainLayout, Toast, Card, ErrorBoundary } from '../components/UI';
 */

// Toast notifications (app-specific styling and ToastList)
export { default as Toast, ToastList } from './feedback/Toast';

// Additional spinner variants
export { InlineSpinner, PageLoader } from './feedback/Spinner';

// Error boundary (class component for catching React errors)
export { default as ErrorBoundary } from './data/ErrorBoundary';

// Card component (with Header, Body, Footer compound components)
export { default as Card } from './data/Card';

// App shell layouts
export { default as MainLayout } from './layout/MainLayout';
export { default as PageLayout } from './layout/PageLayout';

// Form components with app-specific styling
export { default as SearchInput } from './forms/SearchInput';

// Action button with loading state and disabled tooltip
export { default as ActionButton } from './buttons/ActionButton';
