/**
 * DojoErrorBanner - Dismissible error notification
 *
 * Displays errors with close button.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';

import {
  ErrorBanner,
  ErrorBannerInner,
  CloseErrorBtn,
} from './DojoPage.styles';

const DojoErrorBanner = ({ error, onDismiss }) => {
  return (
    <AnimatePresence>
      {error && (
        <ErrorBanner
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          role="alert"
        >
          <ErrorBannerInner>
            <span>{error}</span>
            <CloseErrorBtn
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              <MdClose aria-hidden="true" />
            </CloseErrorBtn>
          </ErrorBannerInner>
        </ErrorBanner>
      )}
    </AnimatePresence>
  );
};

export default DojoErrorBanner;
