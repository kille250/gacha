/**
 * PromptBrowserPage - Page for browsing Civitai prompts
 *
 * Provides a searchable library of AI-generated image prompts
 * that can be used with the Stable Horde generator.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaImages } from 'react-icons/fa';
import { theme, Container } from '../design-system';
import { useToast } from '../context/ToastContext';
import PromptBrowser from '../components/PromptBrowser';
import { pageEnterVariants } from '../App';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const PageContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: ${theme.spacing.lg};
  padding-bottom: calc(${theme.navHeights.bottom} + ${theme.spacing.xl});

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    padding-bottom: calc(${theme.navHeights.bottom} + ${theme.spacing.lg});
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.sm}) {
    margin-bottom: ${theme.spacing.lg};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.text};
    border-color: ${theme.colors.primary};
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const PageTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const PageDescription = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const BrowserContainer = styled.div`
  flex: 1;
`;

// ===========================================
// COMPONENT
// ===========================================

function PromptBrowserPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleUsePrompt = useCallback((promptData) => {
    // Store the prompt in sessionStorage for the generator to pick up
    try {
      sessionStorage.setItem('pendingPrompt', JSON.stringify(promptData));
      toast.success('Prompt ready!', 'Navigate to the generator to use it');

      // Optionally navigate to generator page
      // navigate('/generator');
    } catch (err) {
      console.error('Failed to store prompt:', err);
      toast.error('Failed to save prompt');
    }
  }, [toast]);

  return (
    <PageContainer
      variants={pageEnterVariants}
      initial="initial"
      animate="animate"
    >
      <Header>
        <BackButton onClick={handleBack} aria-label="Go back">
          <FaArrowLeft />
        </BackButton>
        <HeaderContent>
          <PageTitle>
            <FaImages />
            Prompt Library
          </PageTitle>
          <PageDescription>
            Browse and search AI-generated image prompts from Civitai.
            Copy prompts or use them directly with the Stable Horde generator.
          </PageDescription>
        </HeaderContent>
      </Header>

      <BrowserContainer>
        <PromptBrowser
          onUsePrompt={handleUsePrompt}
          showUseButton={true}
        />
      </BrowserContainer>
    </PageContainer>
  );
}

export default PromptBrowserPage;
