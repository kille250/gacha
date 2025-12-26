/**
 * PityDisplay - Visible pity progress for gacha
 *
 * Shows detailed pity counters and progress toward
 * guaranteed pulls.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { usePityState } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 16px;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h4`
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PityRow = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const RarityLabel = styled.span`
  color: ${props => props.$color || '#fff'};
  font-weight: 600;
  font-size: 0.9rem;
`;

const PityCount = styled.span`
  color: #888;
  font-size: 0.85rem;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)`
  background: ${props => props.$color || '#2196f3'};
  height: 100%;
  border-radius: 8px;
`;

const SoftPityMarker = styled.div`
  position: absolute;
  left: ${props => props.$position}%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.5);
`;

const PityInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
`;

const SoftPityBadge = styled.span`
  background: ${props => props.$active ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? '#ffc107' : '#888'};
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
`;

const GuaranteedMessage = styled(motion.div)`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  margin-top: 16px;
`;

const BannerPitySection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const GuaranteedLabel = styled.div`
  color: #4caf50;
  font-weight: 600;
  font-size: 0.9rem;
`;

const LoadingState = styled.div`
  color: #888;
  text-align: center;
  padding: 20px;
`;

const RARITY_COLORS = {
  legendary: '#ffd700',
  epic: '#9c27b0',
  rare: '#2196f3'
};

export function PityDisplay({ bannerId = null, compact = false }) {
  const { pityState, loading, error } = usePityState(bannerId);

  if (loading) {
    return (
      <Container>
        <LoadingState>Loading pity info...</LoadingState>
      </Container>
    );
  }

  if (error || !pityState) {
    return null;
  }

  const { standard, banner } = pityState;

  if (compact) {
    // Compact version for inline display
    return (
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ padding: '12px' }}
      >
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.legendary}>
              {standard.progress.legendary.current}/{standard.progress.legendary.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Legendary</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.epic}>
              {standard.progress.epic.current}/{standard.progress.epic.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Epic</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <RarityLabel $color={RARITY_COLORS.rare}>
              {standard.progress.rare.current}/{standard.progress.rare.max}
            </RarityLabel>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>Rare</div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Title>Pity Progress</Title>

      {/* Legendary Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.legendary}>Legendary</RarityLabel>
          <PityCount>
            {standard.progress.legendary.current} / {standard.progress.legendary.max}
            {standard.untilGuaranteed.legendary === 0 && ' (Guaranteed!)'}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          <SoftPityMarker $position={(75 / 90) * 100} />
          <ProgressFill
            $color={RARITY_COLORS.legendary}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.legendary.percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.legendary} pulls until guaranteed</span>
          <SoftPityBadge $active={standard.softPity.legendary}>
            {standard.softPity.legendary ? 'Soft Pity Active' : 'Soft Pity @ 75'}
          </SoftPityBadge>
        </PityInfo>
      </PityRow>

      {/* Epic Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.epic}>Epic</RarityLabel>
          <PityCount>
            {standard.progress.epic.current} / {standard.progress.epic.max}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          <SoftPityMarker $position={(40 / 50) * 100} />
          <ProgressFill
            $color={RARITY_COLORS.epic}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.epic.percent}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.epic} pulls until guaranteed</span>
          <SoftPityBadge $active={standard.softPity.epic}>
            {standard.softPity.epic ? 'Soft Pity Active' : 'Soft Pity @ 40'}
          </SoftPityBadge>
        </PityInfo>
      </PityRow>

      {/* Rare Pity */}
      <PityRow>
        <PityHeader>
          <RarityLabel $color={RARITY_COLORS.rare}>Rare</RarityLabel>
          <PityCount>
            {standard.progress.rare.current} / {standard.progress.rare.max}
          </PityCount>
        </PityHeader>
        <ProgressBar>
          <ProgressFill
            $color={RARITY_COLORS.rare}
            initial={{ width: 0 }}
            animate={{ width: `${standard.progress.rare.percent}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </ProgressBar>
        <PityInfo>
          <span>{standard.untilGuaranteed.rare} pulls until guaranteed</span>
        </PityInfo>
      </PityRow>

      {/* Banner-specific pity */}
      {banner && (
        <BannerPitySection>
          <Title style={{ marginBottom: 12 }}>Banner Pity</Title>
          {banner.guaranteedFeatured ? (
            <GuaranteedMessage
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <GuaranteedLabel>
                Next 5-star is GUARANTEED to be the featured character!
              </GuaranteedLabel>
            </GuaranteedMessage>
          ) : (
            <PityInfo style={{ justifyContent: 'center', color: '#888' }}>
              {banner.message}
            </PityInfo>
          )}
        </BannerPitySection>
      )}

      {/* Near guarantee message */}
      {standard.untilGuaranteed.legendary <= 10 && standard.untilGuaranteed.legendary > 0 && (
        <GuaranteedMessage
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span style={{ color: '#ffc107' }}>
            Only {standard.untilGuaranteed.legendary} pulls away from guaranteed Legendary!
          </span>
        </GuaranteedMessage>
      )}
    </Container>
  );
}

export default PityDisplay;
