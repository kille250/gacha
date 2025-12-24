/**
 * Carousel - Horizontal scrolling container with navigation
 *
 * Provides consistent carousel behavior with keyboard navigation,
 * scroll buttons, and proper accessibility.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { theme } from '../../styles/DesignSystem';

const CarouselSection = styled.div`
  margin-bottom: ${theme.spacing['2xl']};
`;

const CarouselHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CarouselTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: ${theme.colors.text};
`;

const CarouselNav = styled.div`
  display: flex;
  gap: 8px;
`;

const NavButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 24px;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CarouselTrack = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 10px 0 20px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    display: none;
  }

  /* Allow focus on the track for keyboard navigation */
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 4px;
    border-radius: ${theme.radius.lg};
  }
`;

const ScrollIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    display: none; /* Hide on desktop where arrows are visible */
  }
`;

const IndicatorDot = styled.div`
  width: ${props => props.$active ? '16px' : '6px'};
  height: 6px;
  border-radius: 3px;
  background: ${props => props.$active
    ? theme.colors.primary
    : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.2s ease;
`;

/**
 * Carousel Component
 *
 * @param {Object} props
 * @param {string} props.title - Carousel title
 * @param {string} props.icon - Icon/emoji for title
 * @param {React.ReactNode} props.children - Carousel items
 * @param {number} props.scrollAmount - Pixels to scroll per button click
 * @param {boolean} props.showIndicators - Whether to show scroll indicators on mobile
 * @param {number} props.itemCount - Total number of items (for indicators)
 */
const Carousel = ({
  title,
  icon,
  children,
  scrollAmount = 340,
  showIndicators = true,
  itemCount = 0,
}) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    setCanScrollLeft(track.scrollLeft > 0);
    setCanScrollRight(
      track.scrollLeft < track.scrollWidth - track.clientWidth - 10
    );

    // Calculate active index for indicators
    if (itemCount > 0) {
      const itemWidth = scrollAmount;
      const newIndex = Math.round(track.scrollLeft / itemWidth);
      setActiveIndex(Math.min(newIndex, itemCount - 1));
    }
  }, [itemCount, scrollAmount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateScrollState();
    track.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollLeft = useCallback(() => {
    trackRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  }, [scrollAmount]);

  const scrollRight = useCallback(() => {
    trackRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, [scrollAmount]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollRight();
    }
  }, [scrollLeft, scrollRight]);

  return (
    <CarouselSection>
      <CarouselHeader>
        <CarouselTitle>
          {icon && <span>{icon}</span>}
          {title}
        </CarouselTitle>
        <CarouselNav>
          <NavButton
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <MdChevronLeft />
          </NavButton>
          <NavButton
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <MdChevronRight />
          </NavButton>
        </CarouselNav>
      </CarouselHeader>

      <CarouselTrack
        ref={trackRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={title || 'Carousel'}
      >
        {children}
      </CarouselTrack>

      {showIndicators && itemCount > 1 && (
        <ScrollIndicator>
          {Array.from({ length: Math.min(itemCount, 5) }).map((_, idx) => (
            <IndicatorDot key={idx} $active={idx === activeIndex % 5} />
          ))}
        </ScrollIndicator>
      )}
    </CarouselSection>
  );
};

export default Carousel;
