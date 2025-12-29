/**
 * FatePointsDisplay - Fate points accumulation and exchange
 *
 * Shows fate points earned from pulling and allows
 * exchange for guaranteed characters.
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaHeart, FaCrown, FaSync, FaMagic, FaCheck, FaSpinner, FaExclamationTriangle, FaStar, FaGem, FaArrowUp } from 'react-icons/fa';
import { useFatePoints } from '../../hooks/useGameEnhancements';
import { onVisibilityChange } from '../../cache';
import { useTranslation } from 'react-i18next';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(156, 39, 176, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PointsCounter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(103, 58, 183, 0.2) 100%);
  padding: 8px 16px;
  border-radius: 20px;
`;

const PointsIcon = styled.span`
  font-size: 1.2rem;
`;

const PointsValue = styled.span`
  color: #ba68c8;
  font-weight: 700;
  font-size: 1.1rem;
`;

const ProgressSection = styled.div`
  margin-bottom: 20px;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
`;

const ProgressText = styled.span`
  color: #888;
`;

const ResetInfo = styled.span`
  color: #666;
  font-size: 0.75rem;
`;

const ProgressCount = styled.span`
  color: #ba68c8;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 12px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  background: linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%);
  height: 100%;
  border-radius: 10px;
`;

const ExchangeSection = styled.div`
  margin-top: 16px;
`;

const ExchangeTitle = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 12px;
`;

const ExchangeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const ExchangeCard = styled(motion.div)`
  background: ${props => props.$affordable
    ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(103, 58, 183, 0.15) 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$affordable
    ? 'rgba(156, 39, 176, 0.4)'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: ${props => props.$affordable ? 'pointer' : 'default'};
  opacity: ${props => props.$affordable ? 1 : 0.5};
  transition: all 0.2s ease;

  &:hover {
    ${props => props.$affordable && `
      border-color: rgba(156, 39, 176, 0.6);
      transform: translateY(-2px);
    `}
  }
`;

const ItemIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 8px;
`;

const ItemName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
`;

const ItemCost = styled.div`
  color: #ba68c8;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ExchangeModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 28px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  border: 2px solid rgba(156, 39, 176, 0.4);
`;

const ModalIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
`;

const ModalTitle = styled.div`
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ModalDesc = styled.div`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
`;

const ModalCost = styled.div`
  background: rgba(156, 39, 176, 0.2);
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const CostLabel = styled.div`
  color: #888;
  font-size: 0.8rem;
`;

const CostValue = styled.div`
  color: #ba68c8;
  font-size: 1.4rem;
  font-weight: 700;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled(motion.button)`
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
`;

const ExchangeButton = styled(Button)`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: #fff;
`;

const CancelButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
`;

const InfoBox = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 0.8rem;
  color: #888;
`;

const CapWarning = styled(motion.div)`
  background: ${props => props.$atCap
    ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(211, 47, 47, 0.15) 100%)'
    : 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(245, 124, 0, 0.15) 100%)'};
  border: 1px solid ${props => props.$atCap ? 'rgba(244, 67, 54, 0.4)' : 'rgba(255, 152, 0, 0.4)'};
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: ${props => props.$atCap ? '#ef5350' : '#ffb74d'};
`;

// Success Toast
const SuccessToast = styled(motion.div)`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: #fff;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
  z-index: 1001;
`;

const ToastIcon = styled.div`
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ToastContent = styled.div`
  .title {
    font-weight: 600;
    font-size: 0.95rem;
  }
  .hint {
    font-size: 0.8rem;
    opacity: 0.9;
  }
`;

const RemainingPoints = styled.div`
  color: #666;
  font-size: 0.75rem;
  margin-top: 4px;
`;

const LoadingSpinner = styled(FaSpinner)`
  animation: spin 1s linear infinite;
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Icon mapping for exchange options from backend
const EXCHANGE_ICONS = {
  roll_tickets: FaTicketAlt,
  premium_tickets: FaGem,
  rare_selector: FaStar,
  epic_selector: FaHeart,
  legendary_selector: FaCrown,
  pity_boost: FaSync,
  xp_boost: FaArrowUp,
  banner_pity_reset: FaSync  // Legacy support
};

export function FatePointsDisplay({ bannerId = null }) {
  const { t } = useTranslation();
  const { fatePoints, loading, error, exchangePoints, refreshFatePoints } = useFatePoints(bannerId);
  const [selectedItem, setSelectedItem] = useState(null);
  const [exchanging, setExchanging] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Refresh fate points when tab becomes visible after being hidden
  useEffect(() => {
    return onVisibilityChange('fate-points-display', (staleLevel) => {
      if (staleLevel && refreshFatePoints) {
        refreshFatePoints();
      }
    });
  }, [refreshFatePoints]);

  // Build exchange options from backend data with icons and translated descriptions
  const exchangeOptions = useMemo(() => {
    if (!fatePoints?.exchangeOptions) return [];
    return fatePoints.exchangeOptions.map(opt => ({
      ...opt,
      // Use translated name and description, fallback to backend values
      name: t(`fatePoints.exchangeOptions.${opt.id}`, opt.name),
      description: t(`fatePoints.exchangeOptions.${opt.id}_desc`, opt.description),
      Icon: EXCHANGE_ICONS[opt.id] || FaMagic
    }));
  }, [fatePoints?.exchangeOptions, t]);

  if (loading) {
    return (
      <Container>
        <Title><LoadingSpinner /> {t('fatePoints.loading', 'Loading fate points...')}</Title>
      </Container>
    );
  }

  if (error || !fatePoints) {
    return null;
  }

  // Extract values with safe defaults
  const points = fatePoints.points ?? 0;
  const pointsThisWeek = fatePoints.pointsThisWeek ?? 0;
  const weeklyMax = fatePoints.weeklyMax ?? 500;

  const handleExchange = async () => {
    if (!selectedItem || exchanging) return;

    setExchanging(true);
    try {
      // Pass the exchange type to the API
      await exchangePoints(selectedItem.id);

      // Show success toast
      const isSelector = selectedItem.id.includes('selector');
      const isPityBoost = selectedItem.id === 'pity_boost' || selectedItem.id === 'banner_pity_reset';
      setSuccessToast({
        title: t('fatePoints.exchangeSuccess', { item: selectedItem.name }) || `${selectedItem.name} obtained!`,
        hint: isSelector
          ? t('fatePoints.selectorHint', 'Go to Profile to use your selector')
          : isPityBoost
            ? t('fatePoints.pityBoostHint', 'Your pity has been boosted to 50%!')
            : ''
      });

      // Auto-hide toast after 4 seconds
      setTimeout(() => setSuccessToast(null), 4000);

      setSelectedItem(null);
    } catch (err) {
      console.error('Exchange failed:', err);
    } finally {
      setExchanging(false);
    }
  };

  // Safe calculation with guards against division by zero
  const weeklyProgress = weeklyMax > 0 ? (pointsThisWeek / weeklyMax) * 100 : 0;

  // Calculate remaining points after exchange for preview
  const remainingAfterExchange = selectedItem ? points - selectedItem.cost : points;

  // Near-cap warning threshold (90% of weekly max)
  const nearCapThreshold = weeklyMax * 0.9;
  const isNearCap = pointsThisWeek >= nearCapThreshold && pointsThisWeek < weeklyMax;
  const isAtCap = pointsThisWeek >= weeklyMax;

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>{t('fatePoints.title', 'Fate Points')}</Title>
          <PointsCounter>
            <PointsIcon><FaMagic size={16} /></PointsIcon>
            <PointsValue>{points}</PointsValue>
          </PointsCounter>
        </Header>

        {/* Near-cap / At-cap warning */}
        <AnimatePresence>
          {(isNearCap || isAtCap) && (
            <CapWarning
              $atCap={isAtCap}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FaExclamationTriangle />
              {isAtCap
                ? t('fatePoints.capReached', 'Weekly cap reached')
                : t('fatePoints.nearingCap', 'Nearing weekly cap!')}
            </CapWarning>
          )}
        </AnimatePresence>

        <ProgressSection>
          <ProgressLabel>
            <ProgressText>
              {t('fatePoints.weeklyEarnings', 'Weekly Earnings')}
              <ResetInfo> ({t('fatePoints.weeklyResetsInfo', 'Resets Monday 00:00 UTC')})</ResetInfo>
            </ProgressText>
            <ProgressCount>{pointsThisWeek} / {weeklyMax}</ProgressCount>
          </ProgressLabel>
          <ProgressBar>
            <ProgressFill
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(weeklyProgress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </ProgressBar>
        </ProgressSection>

        <ExchangeSection>
          <ExchangeTitle>{t('fatePoints.exchangeForRewards', 'Exchange for Rewards')}</ExchangeTitle>
          <ExchangeGrid>
            {exchangeOptions.map(option => {
              const affordable = points >= option.cost;
              const IconComponent = option.Icon;
              return (
                <ExchangeCard
                  key={option.id}
                  $affordable={affordable}
                  onClick={() => affordable && setSelectedItem(option)}
                  whileHover={affordable ? { scale: 1.02 } : {}}
                  whileTap={affordable ? { scale: 0.98 } : {}}
                >
                  <ItemIcon><IconComponent size={40} /></ItemIcon>
                  <ItemName>{option.name}</ItemName>
                  <ItemCost>{option.cost} {t('fatePoints.fp', 'FP')}</ItemCost>
                </ExchangeCard>
              );
            })}
          </ExchangeGrid>
        </ExchangeSection>

        <InfoBox>
          {t('fatePoints.infoBox', 'Earn Fate Points by pulling on any banner. 1 pull = 1 FP. Your FP pool is shared globally and can be spent on any exchange. Weekly cap ensures fair progression.')}
        </InfoBox>
      </Container>

      <AnimatePresence>
        {selectedItem && (
          <ExchangeModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalIcon><selectedItem.Icon size={64} /></ModalIcon>
              <ModalTitle>{selectedItem.name}</ModalTitle>
              <ModalDesc>{selectedItem.description}</ModalDesc>

              <ModalCost>
                <CostLabel>{t('fatePoints.cost', 'Cost')}</CostLabel>
                <CostValue>{selectedItem.cost} {t('fatePoints.fatePoints', 'Fate Points')}</CostValue>
                <RemainingPoints>
                  {t('fatePoints.remainingAfter', 'Remaining after exchange')}: {remainingAfterExchange} {t('fatePoints.fp', 'FP')}
                </RemainingPoints>
              </ModalCost>

              <ButtonGroup>
                <CancelButton
                  onClick={() => setSelectedItem(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('common.cancel', 'Cancel')}
                </CancelButton>
                <ExchangeButton
                  onClick={handleExchange}
                  disabled={exchanging}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {exchanging ? <><LoadingSpinner /> {t('fatePoints.exchanging', 'Exchanging...')}</> : t('fatePoints.exchange', 'Exchange')}
                </ExchangeButton>
              </ButtonGroup>
            </ModalContent>
          </ExchangeModal>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <SuccessToast
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            onClick={() => setSuccessToast(null)}
          >
            <ToastIcon>
              <FaCheck size={14} />
            </ToastIcon>
            <ToastContent>
              <div className="title">{successToast.title}</div>
              <div className="hint">{successToast.hint}</div>
            </ToastContent>
          </SuccessToast>
        )}
      </AnimatePresence>
    </>
  );
}

export default FatePointsDisplay;
