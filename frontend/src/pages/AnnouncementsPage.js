/**
 * AnnouncementsPage - User-facing announcements page
 *
 * Displays all announcements with filtering and read status.
 * Uses the AnnouncementCenter component for the main content.
 */
import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FaBullhorn } from 'react-icons/fa';
import { Container, PageTransition, theme } from '../design-system';
import { AnnouncementCenter } from '../components/Announcements';

const AnnouncementsPage = () => {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <StyledPageWrapper>
        {/* Header */}
        <Header>
          <Container>
            <HeaderContent>
              <PageTitle>
                <TitleIcon><FaBullhorn /></TitleIcon>
                {t('announcements.title', 'Announcements')}
              </PageTitle>
              <PageSubtitle>
                {t('announcements.subtitle', 'Stay updated with the latest news and updates')}
              </PageSubtitle>
            </HeaderContent>
          </Container>
        </Header>

        {/* Content */}
        <Container>
          <ContentWrapper>
            <AnnouncementCenter />
          </ContentWrapper>
        </Container>
      </StyledPageWrapper>
    </PageTransition>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled.div`
  min-height: 100vh;
  padding-bottom: ${theme.spacing['3xl']};
  background: linear-gradient(
    180deg,
    ${theme.colors.background} 0%,
    ${theme.colors.backgroundSubtle} 100%
  );
`;

const Header = styled.header`
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(88, 86, 214, 0.12) 0%,
    rgba(88, 86, 214, 0.04) 60%,
    transparent 100%
  );
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xl} 0 ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(0, 113, 227, 0.08) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg} 0 ${theme.spacing.md};
  }
`;

const HeaderContent = styled.div`
  text-align: center;
  position: relative;
  z-index: 1;
`;

const PageTitle = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  font-size: clamp(${theme.fontSizes['2xl']}, 5vw, ${theme.fontSizes['3xl']});
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
`;

const TitleIcon = styled.span`
  font-size: clamp(28px, 4vw, 36px);
  -webkit-text-fill-color: initial;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary};

  svg {
    filter: drop-shadow(0 2px 8px rgba(88, 86, 214, 0.3));
  }
`;

const PageSubtitle = styled.p`
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  letter-spacing: 0.02em;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const ContentWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

export default AnnouncementsPage;
