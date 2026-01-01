/**
 * OnboardingOverlay - New player tutorial for Essence Tap
 *
 * Features:
 * - Step-by-step introduction to game mechanics
 * - Highlights interactive elements
 * - Only shows once per user
 */

import React, { useState, useCallback, memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button } from '../../design-system';
import {
  IconGem,
  IconTap,
  IconLightning,
  IconUpgrade,
  IconCharacters,
  IconSparkles
} from '../../constants/icons';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.lg};
`;

const ContentCard = styled(motion.div)`
  max-width: 500px;
  width: 100%;
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(138, 43, 226, 0.5);
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const StepIndicator = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: center;
  margin-bottom: ${theme.spacing.lg};
`;

const StepDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$active ? '#A855F7' : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
`;

const StepIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md};
`;

const StepTitle = styled.h2`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const StepDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.6;
`;

const TipBox = styled.div`
  background: rgba(138, 43, 226, 0.15);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const TipLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #A855F7;
  margin-bottom: ${theme.spacing.xs};
`;

const TipText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
`;

const SkipButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  padding: ${theme.spacing.sm};

  &:hover {
    color: ${theme.colors.text};
  }
`;

// Onboarding steps with React Icon components
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    IconComponent: IconGem,
    title: 'Welcome to Essence Tap!',
    description: 'Tap to collect essence, build generators for passive income, and prestige for permanent bonuses. Ready to begin your essence-collecting journey?',
    tip: {
      label: 'Quick Tip',
      text: 'The more you tap, the more essence you collect. But generators will earn essence even when you\'re away!'
    }
  },
  {
    id: 'tap',
    IconComponent: IconTap,
    title: 'Tap to Collect',
    description: 'Tap the glowing orb in the center to collect essence. Build up combos by tapping quickly, and watch for golden essence (100x bonus!) and critical hits.',
    tip: {
      label: 'Pro Tip',
      text: 'Combos can double your tap power! Keep tapping to maintain your combo streak.'
    }
  },
  {
    id: 'generators',
    IconComponent: IconLightning,
    title: 'Build Generators',
    description: 'Use your essence to purchase generators on the left panel. Each generator produces essence automatically, even when you\'re offline!',
    tip: {
      label: 'Strategy',
      text: 'Balance between cheap generators (many) and expensive ones (powerful). Synergy upgrades make them boost each other!'
    }
  },
  {
    id: 'upgrades',
    IconComponent: IconUpgrade,
    title: 'Purchase Upgrades',
    description: 'The right panel contains upgrades that permanently boost your tap power, critical hit chance, and generator output.',
    tip: {
      label: 'Recommendation',
      text: 'Critical hit upgrades are powerful - a 50x crit multiplier can massively boost your essence income!'
    }
  },
  {
    id: 'characters',
    IconComponent: IconCharacters,
    title: 'Assign Characters',
    description: 'Your collected characters provide production bonuses! Higher rarity characters give bigger bonuses. Matching elements create synergy bonuses.',
    tip: {
      label: 'Collector Bonus',
      text: '5 legendary characters can give you a 3.5x multiplier to ALL production!'
    }
  },
  {
    id: 'prestige',
    IconComponent: IconSparkles,
    title: 'Awaken for Power',
    description: 'Once you\'ve earned 1M lifetime essence, you can "Awaken" to reset your progress but gain permanent multipliers called Shards. Each awakening makes you stronger!',
    tip: {
      label: 'Long-term Goal',
      text: 'Awakening also grants Fate Points! Your first awakening gives 25 FP.'
    }
  }
];

const OnboardingOverlay = memo(({ isOpen, onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ContentCard
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepIndicator>
              {ONBOARDING_STEPS.map((_, index) => (
                <StepDot key={index} $active={index === currentStep} />
              ))}
            </StepIndicator>

            <StepIcon><step.IconComponent size={64} /></StepIcon>

            <StepTitle>
              {t(`essenceTap.onboarding.${step.id}.title`, { defaultValue: step.title })}
            </StepTitle>

            <StepDescription>
              {t(`essenceTap.onboarding.${step.id}.description`, { defaultValue: step.description })}
            </StepDescription>

            {step.tip && (
              <TipBox>
                <TipLabel>{step.tip.label}</TipLabel>
                <TipText>
                  {t(`essenceTap.onboarding.${step.id}.tip`, { defaultValue: step.tip.text })}
                </TipText>
              </TipBox>
            )}

            <ButtonRow>
              {currentStep > 0 && (
                <Button variant="secondary" onClick={handlePrev}>
                  {t('common.back', { defaultValue: 'Back' })}
                </Button>
              )}
              <Button variant="primary" onClick={handleNext}>
                {isLastStep
                  ? t('essenceTap.startPlaying', { defaultValue: 'Start Playing!' })
                  : t('common.next', { defaultValue: 'Next' })}
              </Button>
            </ButtonRow>

            <SkipButton onClick={handleSkip}>
              {t('essenceTap.skipTutorial', { defaultValue: 'Skip Tutorial' })}
            </SkipButton>
          </ContentCard>
        </Overlay>
      )}
    </AnimatePresence>
  );
});

OnboardingOverlay.displayName = 'OnboardingOverlay';

export default OnboardingOverlay;
