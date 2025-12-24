/**
 * VirtualizedFilesGrid - Virtual scrolling grid for large file batches
 *
 * Uses windowing to efficiently render large numbers of file cards.
 * Falls back to regular grid when file count is below threshold.
 *
 * Features:
 * - Virtual scrolling for performance with 50+ files
 * - Responsive grid layout
 * - Smooth scrolling
 * - Accessibility maintained
 */
import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { theme } from '../../design-system';
import FileCard from './FileCard';

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 20;

// Row height estimate for each card
const CARD_HEIGHT_MOBILE = 380;
const CARD_HEIGHT_DESKTOP = 320;

// Get number of columns based on viewport width
const getColumnCount = (width) => {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 480) return 2;
  return 1;
};

const VirtualizedFilesGrid = memo(({
  files,
  fileStatus,
  fileValidation,
  orderedRarities,
  onUpdateMetadata,
  onRemoveFile,
  onCopyToAll,
  onRegenerateName,
  onDismissWarning,
  onTouchField,
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Determine if we should virtualize
  const shouldVirtualize = files.length > VIRTUALIZATION_THRESHOLD;

  // Get responsive values
  const columnCount = useMemo(() => getColumnCount(containerWidth), [containerWidth]);
  const cardHeight = containerWidth < 768 ? CARD_HEIGHT_MOBILE : CARD_HEIGHT_DESKTOP;
  const gap = 16;

  // Calculate total rows and heights
  const rowCount = Math.ceil(files.length / columnCount);
  const totalHeight = rowCount * (cardHeight + gap) - gap;

  // Calculate visible rows based on scroll position
  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: files.length - 1 };
    }

    const overscan = 2; // Extra rows to render above/below viewport
    const startRow = Math.max(0, Math.floor(scrollTop / (cardHeight + gap)) - overscan);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + containerHeight) / (cardHeight + gap)) + overscan
    );

    return {
      start: startRow * columnCount,
      end: Math.min(files.length - 1, (endRow + 1) * columnCount - 1),
    };
  }, [scrollTop, containerHeight, cardHeight, gap, columnCount, rowCount, files.length, shouldVirtualize]);

  // Get visible files
  const visibleFiles = useMemo(() => {
    if (!shouldVirtualize) return files;
    return files.slice(visibleRange.start, visibleRange.end + 1);
  }, [files, visibleRange, shouldVirtualize]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    if (shouldVirtualize) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [shouldVirtualize]);

  // Regular non-virtualized grid
  if (!shouldVirtualize) {
    return (
      <RegularGrid role="list" aria-label="Uploaded files">
        <AnimatePresence>
          {files.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              index={index}
              fileStatus={fileStatus[file.id]}
              fileValidation={fileValidation[file.id]}
              orderedRarities={orderedRarities}
              onUpdateMetadata={onUpdateMetadata}
              onRemove={onRemoveFile}
              onCopyToAll={onCopyToAll}
              onRegenerateName={onRegenerateName}
              onDismissWarning={onDismissWarning}
              onTouchField={onTouchField}
            />
          ))}
        </AnimatePresence>
      </RegularGrid>
    );
  }

  // Virtualized grid
  return (
    <VirtualContainer
      ref={containerRef}
      onScroll={handleScroll}
      role="list"
      aria-label={`Uploaded files (${files.length} total)`}
    >
      <VirtualContent style={{ height: totalHeight }}>
        {visibleFiles.map((file) => {
          const originalIndex = files.indexOf(file);
          const row = Math.floor(originalIndex / columnCount);
          const col = originalIndex % columnCount;
          const top = row * (cardHeight + gap);
          const left = `calc(${(col / columnCount) * 100}% + ${(gap * col) / columnCount}px)`;
          const width = `calc(${100 / columnCount}% - ${(gap * (columnCount - 1)) / columnCount}px)`;

          return (
            <VirtualItem
              key={file.id}
              style={{
                top,
                left,
                width,
                height: cardHeight,
              }}
            >
              <FileCard
                file={file}
                index={originalIndex}
                fileStatus={fileStatus[file.id]}
                fileValidation={fileValidation[file.id]}
                orderedRarities={orderedRarities}
                onUpdateMetadata={onUpdateMetadata}
                onRemove={onRemoveFile}
                onCopyToAll={onCopyToAll}
                onRegenerateName={onRegenerateName}
                onDismissWarning={onDismissWarning}
                onTouchField={onTouchField}
              />
            </VirtualItem>
          );
        })}
      </VirtualContent>

      {/* Screen reader announcement for virtualization */}
      <ScreenReaderOnly aria-live="polite">
        Showing files {visibleRange.start + 1} to {visibleRange.end + 1} of {files.length}
      </ScreenReaderOnly>
    </VirtualContainer>
  );
});

VirtualizedFilesGrid.displayName = 'VirtualizedFilesGrid';

// Styled components
const RegularGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: ${theme.breakpoints.xl}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const VirtualContainer = styled.div`
  height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;

  /* Smooth scrolling */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundTertiary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.glassBorder};
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

const VirtualContent = styled.div`
  position: relative;
  width: 100%;
`;

const VirtualItem = styled.div`
  position: absolute;
`;

const ScreenReaderOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export default VirtualizedFilesGrid;
