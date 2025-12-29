/**
 * FortuneWheelPage - Daily spin wheel for rewards
 *
 * This is the page wrapper that imports the FortuneWheelPage component.
 * Wrapped in ErrorBoundary for crash recovery.
 */

import React from 'react';
import ErrorBoundary from '../components/UI/data/ErrorBoundary';
import { FortuneWheelPage as FortuneWheelPageComponent } from '../components/FortuneWheel';

const FortuneWheelPageWithErrorBoundary = () => (
  <ErrorBoundary>
    <FortuneWheelPageComponent />
  </ErrorBoundary>
);

export default FortuneWheelPageWithErrorBoundary;
