/**
 * OnboardingModal - Welcome modal for new users
 *
 * Shows a 3-step introduction to the app:
 * 1. Welcome & what is gacha
 * 2. How to earn points
 * 3. Start collecting
 *
 * Dismisses permanently when user completes or skips.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDice, FaCoins, FaArrowRight, FaTimes, FaCheck } from 'react-icons/fa';
import { MdAutoAwesome, MdCelebration } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme, springs } from '../../design-system';

const ONBOARDING_KEY = 'gacha_onboarding_complete';

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = () => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // localStorage not available
  }
};

const OnboardingModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: FaDice,
      title: t('onboarding.step1Title', 'Welcome to GachaMaster!'),
      description: t('onboarding.step1Desc', 'Discover, collect, and cherish characters from your favorite anime series. Every pull is a chance at something legendary!'),
      highlight: t('onboarding.step1Highlight', '500+ characters to collect'),
      color: theme.colors.primary,
    },
    {
      icon: FaCoins,
      title: t('onboarding.step2Title', 'Earn Points, Roll Characters'),
      description: t('onboarding.step2Desc', 'Claim your hourly reward to earn points. Use points to roll on banners and add characters to your collection.'),
      highlight: t('onboarding.step2Highlight', 'Free points every hour'),
      color: theme.colors.featured,
    },
    {
      icon: MdCelebration,
      title: t('onboarding.step3Title', 'Ready to Start?'),
      description: t('onboarding.step3Desc', 'Featured banners have boosted rates for rare characters. Check the pity counter to track your luck!'),
      highlight: t('onboarding.step3Highlight', 'Good luck, Collector!'),
      color: theme.colors.success,
    },
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
      onClose();
    }
  }, [currentStep, steps.length, onClose]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    onClose();
  }, [onClose]);

  const handleDotClick = useCallback((index) => {
    setCurrentStep(index);
  }, []);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const IconComponent = currentStepData.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Modal
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={springs.smooth}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <CloseButton
              onClick={handleSkip}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={t('common.close', 'Close')}
            >
              <FaTimes />
            </CloseButton>

            <AnimatePresence mode="wait">
              <StepContent
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <IconWrapper style={{ '--glow-color': currentStepData.color }}>
                  <IconCircle $color={currentStepData.color}>
                    <IconComponent />
                  </IconCircle>
                </IconWrapper>

                <Title id="onboarding-title">{currentStepData.title}</Title>
                <Description>{currentStepData.description}</Description>

                <Highlight $color={currentStepData.color}>
                  <MdAutoAwesome />
                  {currentStepData.highlight}
                </Highlight>
              </StepContent>
            </AnimatePresence>

            <Footer>
              <Dots role="tablist" aria-label="Onboarding steps">
                {steps.map((_, index) => (
                  <Dot
                    key={index}
                    $active={index === currentStep}
                    $completed={index < currentStep}
                    onClick={() => handleDotClick(index)}
                    role="tab"
                    aria-selected={index === currentStep}
                    aria-label={`Step ${index + 1} of ${steps.length}`}
                  />
                ))}
              </Dots>

              <Actions>
                {!isLastStep && (
                  <SkipButton
                    onClick={handleSkip}
                    whileHover={{ opacity: 1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('common.skip', 'Skip')}
                  </SkipButton>
                )}

                <NextButton
                  onClick={handleNext}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  $isLast={isLastStep}
                >
                  {isLastStep ? (
                    <>
                      {t('onboarding.getStarted', "Let's Go!")}
                      <FaCheck />
                    </>
                  ) : (
                    <>
                      {t('common.next', 'Next')}
                      <FaArrowRight />
                    </>
                  )}
                </NextButton>
              </Actions>
            </Footer>
          </Modal>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

// Styled Components

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${theme.colors.overlay};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.lg};
  z-index: ${theme.zIndex.modal};
`;

const Modal = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 420px;
  background: ${theme.colors.surfaceSolid};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius['2xl']};
  padding: ${theme.spacing['2xl']};
  box-shadow: ${theme.shadows.xl};
  text-align: center;
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textMuted};
  cursor: pointer;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    color: ${theme.colors.textSecondary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const StepContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const IconWrapper = styled.div`
  margin-bottom: ${theme.spacing.xl};
  filter: drop-shadow(0 0 24px var(--glow-color, ${theme.colors.primary}));
`;

const IconCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$color || theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
`;

const Title = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.md};
  letter-spacing: ${theme.letterSpacing.snug};
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.relaxed};
  margin: 0 0 ${theme.spacing.lg};
  max-width: 340px;
`;

const Highlight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => `${props.$color}15` || theme.colors.primaryMuted};
  border: 1px solid ${props => `${props.$color}30` || theme.colors.primaryMuted};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$color || theme.colors.primary};

  svg {
    font-size: 14px;
  }
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing['2xl']};
`;

const Dots = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const Dot = styled.button`
  width: ${props => props.$active ? '24px' : '8px'};
  height: 8px;
  border-radius: ${theme.radius.full};
  background: ${props =>
    props.$active
      ? theme.colors.primary
      : props.$completed
        ? theme.colors.primaryMuted
        : theme.colors.glass};
  border: none;
  cursor: pointer;
  transition: all ${theme.timing.normal} ${theme.easing.appleSpring};
  padding: 0;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  justify-content: center;
`;

const SkipButton = styled(motion.button)`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: transparent;
  border: none;
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  opacity: 0.8;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    color: ${theme.colors.textSecondary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
    border-radius: ${theme.radius.sm};
  }
`;

const NextButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  box-shadow: ${theme.shadows.buttonPrimary};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut};
  min-width: 140px;

  ${props => props.$isLast && `
    background: ${theme.colors.success};
    box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08);
  `}

  &:hover {
    background: ${props => props.$isLast ? theme.colors.successHover : theme.colors.primaryHover};
    box-shadow: ${theme.shadows.buttonPrimaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      ${theme.shadows.buttonPrimaryHover},
      0 0 0 3px ${theme.colors.focusRing};
  }

  svg {
    font-size: 14px;
  }
`;

export default OnboardingModal;
