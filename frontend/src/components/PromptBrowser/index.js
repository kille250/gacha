/**
 * PromptBrowser - Searchable prompt library with Civitai integration
 *
 * Main component that combines search filters, image grid,
 * and modal viewing for browsing AI-generated image prompts.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { FaRedo, FaExclamationCircle, FaImage, FaSpinner } from 'react-icons/fa';
import { theme, Skeleton, SkeletonCard } from '../../design-system';
import { useToast } from '../../context/ToastContext';
import { useCivitaiSearch } from '../../hooks/useCivitaiSearch';

import SearchFilters from './SearchFilters';
import PromptCard from './PromptCard';
import ImageModal from './ImageModal';
import AgeGateModal from './AgeGateModal';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  width: 100%;
`;

const ResultsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

const ResultsCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    transition: transform 0.3s ease;
  }

  &:hover:not(:disabled) svg {
    transform: rotate(180deg);
  }
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: ${theme.spacing.md};
  }
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: ${theme.spacing.md};
  }
`;

const SkeletonCardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
`;

const SkeletonImage = styled(Skeleton)`
  aspect-ratio: 1;
`;

const SkeletonContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
`;

const SkeletonLine = styled(Skeleton)`
  height: 14px;
  border-radius: ${theme.radius.sm};
`;

const SkeletonBadges = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const SkeletonBadge = styled(Skeleton)`
  width: 60px;
  height: 20px;
  border-radius: ${theme.radius.sm};
`;

const LoadMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.xl} 0;
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${theme.colors.backgroundTertiary};
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    animation: ${props => props.$loading ? 'spin 1s linear infinite' : 'none'};
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  text-align: center;
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.textMuted};
  font-size: 32px;
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const EmptyDescription = styled.p`
  margin: 0;
  max-width: 400px;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  background: ${theme.colors.errorMuted};
  border: 1px solid ${theme.colors.error}30;
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const ErrorIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${theme.colors.error}20;
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.error};
  font-size: 24px;
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.error};
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.errorHover};
  }
`;

// ===========================================
// SKELETON LOADER
// ===========================================

const CardSkeleton = () => (
  <SkeletonCardWrapper>
    <SkeletonImage />
    <SkeletonContent>
      <SkeletonLine style={{ width: '100%' }} />
      <SkeletonLine style={{ width: '80%' }} />
      <SkeletonLine style={{ width: '60%' }} />
      <SkeletonBadges>
        <SkeletonBadge />
        <SkeletonBadge />
        <SkeletonBadge />
      </SkeletonBadges>
    </SkeletonContent>
  </SkeletonCardWrapper>
);

// ===========================================
// MAIN COMPONENT
// ===========================================

function PromptBrowser({
  onUsePrompt,
  showUseButton = true
}) {
  const toast = useToast();

  // Search hook
  const {
    images,
    loading,
    loadingMore,
    error,
    hasMore,
    query,
    nsfw,
    sort,
    period,
    baseModel,
    availableModels,
    search,
    loadMore,
    refresh,
    setNsfw,
    setSort,
    setPeriod,
    setBaseModel
  } = useCivitaiSearch();

  // Modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Age gate state
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [pendingNsfwLevel, setPendingNsfwLevel] = useState(null);

  // Infinite scroll observer
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  // Handle image click
  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowImageModal(false);
    // Delay clearing image to allow exit animation
    setTimeout(() => setSelectedImage(null), 200);
  }, []);

  // Handle use prompt
  const handleUsePrompt = useCallback((promptData) => {
    if (onUsePrompt) {
      onUsePrompt(promptData);
      toast.success('Prompt loaded', 'Ready to generate');
    } else {
      // If no handler provided, just copy to clipboard
      navigator.clipboard.writeText(promptData.prompt)
        .then(() => toast.success('Copied to clipboard'))
        .catch(() => toast.error('Failed to copy'));
    }
  }, [onUsePrompt, toast]);

  // Handle age gate requirement
  const handleAgeGateRequired = useCallback((level) => {
    setPendingNsfwLevel(level);
    setShowAgeGate(true);
  }, []);

  // Handle age gate confirmation
  const handleAgeGateConfirm = useCallback((level) => {
    setNsfw(level);
    setShowAgeGate(false);
    setPendingNsfwLevel(null);
  }, [setNsfw]);

  // Handle age gate close
  const handleAgeGateClose = useCallback(() => {
    setShowAgeGate(false);
    setPendingNsfwLevel(null);
  }, []);

  // Render loading skeleton
  const renderSkeleton = () => (
    <SkeletonGrid>
      {[...Array(8)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </SkeletonGrid>
  );

  // Render error state
  const renderError = () => (
    <ErrorState>
      <ErrorIcon>
        <FaExclamationCircle />
      </ErrorIcon>
      <ErrorMessage>{error}</ErrorMessage>
      <RetryButton onClick={refresh}>
        <FaRedo />
        Try Again
      </RetryButton>
    </ErrorState>
  );

  // Render empty state
  const renderEmpty = () => (
    <EmptyState>
      <EmptyIcon>
        <FaImage />
      </EmptyIcon>
      <EmptyTitle>No images found</EmptyTitle>
      <EmptyDescription>
        {query
          ? `No results for "${query}". Try a different search term or adjust your filters.`
          : 'Search for prompts or browse popular images to get started.'}
      </EmptyDescription>
    </EmptyState>
  );

  return (
    <Container>
      <SearchFilters
        query={query}
        nsfw={nsfw}
        sort={sort}
        period={period}
        baseModel={baseModel}
        availableModels={availableModels}
        onQueryChange={search}
        onNsfwChange={setNsfw}
        onSortChange={setSort}
        onPeriodChange={setPeriod}
        onBaseModelChange={setBaseModel}
        onAgeGateRequired={handleAgeGateRequired}
      />

      {!loading && images.length > 0 && (
        <ResultsHeader>
          <ResultsCount>
            {images.length} image{images.length !== 1 ? 's' : ''} found
          </ResultsCount>
          <RefreshButton onClick={refresh} disabled={loading}>
            <FaRedo />
            Refresh
          </RefreshButton>
        </ResultsHeader>
      )}

      {loading && !loadingMore && renderSkeleton()}

      {error && !loading && renderError()}

      {!loading && !error && images.length === 0 && renderEmpty()}

      {images.length > 0 && (
        <>
          <ImageGrid>
            <AnimatePresence mode="popLayout">
              {images.map((image) => (
                <PromptCard
                  key={image.id}
                  image={image}
                  onImageClick={handleImageClick}
                  onUsePrompt={handleUsePrompt}
                  showUseButton={showUseButton}
                />
              ))}
            </AnimatePresence>
          </ImageGrid>

          {/* Infinite scroll trigger / Load more button */}
          <LoadMoreContainer ref={loadMoreRef}>
            {hasMore && (
              <LoadMoreButton
                onClick={loadMore}
                disabled={loadingMore}
                $loading={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <FaSpinner />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </LoadMoreButton>
            )}
            {!hasMore && images.length > 0 && (
              <ResultsCount>No more images to load</ResultsCount>
            )}
          </LoadMoreContainer>
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        isOpen={showImageModal}
        onClose={handleModalClose}
        onUsePrompt={handleUsePrompt}
        showUseButton={showUseButton}
      />

      {/* Age Gate Modal */}
      <AgeGateModal
        isOpen={showAgeGate}
        onClose={handleAgeGateClose}
        onConfirm={handleAgeGateConfirm}
        requestedLevel={pendingNsfwLevel}
      />
    </Container>
  );
}

PromptBrowser.propTypes = {
  /** Callback when user clicks "Use" on a prompt */
  onUsePrompt: PropTypes.func,
  /** Whether to show the "Use" button on cards */
  showUseButton: PropTypes.bool
};

export default PromptBrowser;

// Also export sub-components for flexibility
export { SearchFilters, PromptCard, ImageModal, AgeGateModal };
