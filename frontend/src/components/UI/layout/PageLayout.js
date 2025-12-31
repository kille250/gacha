/**
 * PageLayout - Consistent page structure with header, content, and footer areas
 *
 * Provides standardized page layout with responsive behavior.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { MdArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { theme, motionVariants, IconButton } from '../../../design-system';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${theme.colors.pageGradient};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.primary};
  position: relative;
  display: flex;
  flex-direction: column;

  ${props => props.$fullScreen && css`
    overflow: hidden;
  `}
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$transparent ? 'transparent' : theme.colors.surface};
  backdrop-filter: ${props => props.$transparent ? 'none' : `blur(${theme.blur.lg})`};
  -webkit-backdrop-filter: ${props => props.$transparent ? 'none' : `blur(${theme.blur.lg})`};
  border-bottom: ${props => props.$transparent ? 'none' : `1px solid ${theme.colors.surfaceBorder}`};
  position: ${props => props.$sticky ? 'sticky' : 'relative'};
  top: 0;
  z-index: ${theme.zIndex.sticky};

  ${props => props.$centered && css`
    justify-content: center;
    text-align: center;
  `}
`;

const HeaderTitle = styled.h1`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  flex: 1;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.xl};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Content = styled(motion.main)`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${props => props.$noPadding ? '0' : theme.spacing.lg};

  ${props => props.$centered && css`
    align-items: center;
    justify-content: center;
  `}

  ${props => props.$maxWidth && css`
    max-width: ${props.$maxWidth};
    margin: 0 auto;
    width: 100%;
  `}

  @media (min-width: ${theme.breakpoints.lg}) {
    padding: ${props => props.$noPadding ? '0' : theme.spacing.xl};
  }
`;

const Footer = styled.footer`
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  align-items: center;
  justify-content: ${props => props.$centered ? 'center' : 'space-between'};
  gap: ${theme.spacing.md};
`;

/**
 * PageLayout Component
 *
 * @param {Object} props
 * @param {string} props.title - Page title for header
 * @param {boolean} props.showBack - Show back button
 * @param {Function} props.onBack - Custom back action (default: navigate(-1))
 * @param {React.ReactNode} props.headerActions - Elements for header right side
 * @param {React.ReactNode} props.footer - Footer content
 * @param {boolean} props.fullScreen - Prevent scrolling
 * @param {boolean} props.noPadding - Remove content padding
 * @param {boolean} props.centered - Center content
 * @param {string} props.maxWidth - Max content width (e.g., '800px', '1200px')
 * @param {boolean} props.transparentHeader - Transparent header background
 * @param {boolean} props.stickyHeader - Make header sticky
 * @param {boolean} props.animate - Animate content entrance
 * @param {React.ReactNode} props.children - Page content
 */
const PageLayout = ({
  title,
  showBack = false,
  onBack,
  headerActions,
  footer,
  fullScreen = false,
  noPadding = false,
  centered = false,
  maxWidth,
  transparentHeader = false,
  stickyHeader = true,
  animate = true,
  children
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const showHeader = title || showBack || headerActions;

  return (
    <PageWrapper $fullScreen={fullScreen}>
      <ContentWrapper>
        {showHeader && (
          <Header
            $transparent={transparentHeader}
            $sticky={stickyHeader}
          >
            {showBack && (
              <IconButton
                size="sm"
                variant="ghost"
                label="Go back"
                onClick={handleBack}
              >
                <MdArrowBack />
              </IconButton>
            )}
            {title && <HeaderTitle>{title}</HeaderTitle>}
            {headerActions && <HeaderActions>{headerActions}</HeaderActions>}
          </Header>
        )}

        <Content
          $noPadding={noPadding}
          $centered={centered}
          $maxWidth={maxWidth}
          id="main-content"
          tabIndex={-1}
          variants={animate ? motionVariants.fadeIn : undefined}
          initial={animate ? 'hidden' : undefined}
          animate={animate ? 'visible' : undefined}
        >
          {children}
        </Content>

        {footer && (
          <Footer $centered={typeof footer === 'string'}>
            {footer}
          </Footer>
        )}
      </ContentWrapper>
    </PageWrapper>
  );
};

// Export sub-components for custom layouts
PageLayout.Header = Header;
PageLayout.HeaderTitle = HeaderTitle;
PageLayout.HeaderActions = HeaderActions;
PageLayout.Content = Content;
PageLayout.Footer = Footer;

export default PageLayout;
