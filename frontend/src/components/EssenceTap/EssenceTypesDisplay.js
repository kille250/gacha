/**
 * EssenceTypesDisplay - Shows breakdown of different essence types
 *
 * Features:
 * - Pure, Ambient, Golden, Prismatic essence breakdown
 * - Visual representation of each type
 * - Bonus information from each type
 */

import React, { useState, useEffect, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { theme, Modal, ModalHeader, ModalBody, ModalFooter, Button } from '../../design-system';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconGem, IconSparkles, IconStar, IconDiamond } from '../../constants/icons';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const TotalDisplay = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.15), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: ${theme.radius.lg};
`;

const TotalLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const TotalValue = styled.div`
  font-size: ${theme.fontSizes.xxxl};
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #A855F7, #EC4899, #F59E0B);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const EssenceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const EssenceCard = styled.div`
  padding: ${theme.spacing.lg};
  background: ${props => `linear-gradient(135deg, ${props.$color}15, ${props.$color}08)`};
  border: 1px solid ${props => `${props.$color}40`};
  border-radius: ${theme.radius.lg};
  text-align: center;
`;

const EssenceIcon = styled.div`
  font-size: 32px;
  margin-bottom: ${theme.spacing.sm};
  color: ${props => props.$color};
`;

const EssenceName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color};
  margin-bottom: ${theme.spacing.xs};
`;

const EssenceAmount = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const EssenceDescription = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const BonusSection = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radius.lg};
`;

const BonusTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const BonusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const BonusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.radius.md};
`;

const BonusLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const BonusIcon = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const BonusName = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

const BonusValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$active ? '#10B981' : theme.colors.textSecondary};
`;

const ESSENCE_TYPES = {
  pure: {
    name: 'Pure Essence',
    color: '#A855F7',
    IconComponent: IconGem,
    description: 'From manual clicks',
    conversionRate: 1.0
  },
  ambient: {
    name: 'Ambient Essence',
    color: '#3B82F6',
    IconComponent: IconSparkles,
    description: 'From generators',
    conversionRate: 0.5
  },
  golden: {
    name: 'Golden Essence',
    color: '#FCD34D',
    IconComponent: IconStar,
    description: 'From golden clicks & crits',
    conversionRate: 10.0
  },
  prismatic: {
    name: 'Prismatic Essence',
    color: '#EC4899',
    IconComponent: IconDiamond,
    description: 'From jackpots & tournaments',
    conversionRate: 100.0
  }
};

const EssenceTypesDisplay = memo(({
  isOpen,
  onClose,
  getEssenceTypes
}) => {
  const { t } = useTranslation();
  const [essenceData, setEssenceData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch essence types data
  useEffect(() => {
    if (isOpen && getEssenceTypes) {
      setLoading(true);
      getEssenceTypes().then(result => {
        if (result.success) {
          setEssenceData(result);
        }
        setLoading(false);
      });
    }
  }, [isOpen, getEssenceTypes]);

  const essenceTypes = essenceData?.essenceTypes || {
    pure: 0,
    ambient: 0,
    golden: 0,
    prismatic: 0
  };

  // Calculate total essence
  const totalEssence = Object.entries(essenceTypes).reduce((sum, [type, amount]) => {
    return sum + (amount * ESSENCE_TYPES[type].conversionRate);
  }, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <IconGem size={24} style={{ marginRight: 8 }} />
        {t('essenceTap.essenceTypes.title', { defaultValue: 'Essence Types' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              {t('common.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : (
            <>
              {/* Total Display */}
              <TotalDisplay>
                <TotalLabel>
                  {t('essenceTap.essenceTypes.totalValue', { defaultValue: 'Total Essence Value' })}
                </TotalLabel>
                <TotalValue>
                  {formatNumber(totalEssence)}
                </TotalValue>
              </TotalDisplay>

              {/* Essence Type Cards */}
              <EssenceGrid>
                {Object.entries(ESSENCE_TYPES).map(([type, config]) => {
                  const TypeIcon = config.IconComponent;
                  return (
                    <EssenceCard key={type} $color={config.color}>
                      <EssenceIcon $color={config.color}>
                        <TypeIcon size={32} />
                      </EssenceIcon>
                      <EssenceName $color={config.color}>
                        {config.name}
                      </EssenceName>
                      <EssenceAmount>
                        {formatNumber(essenceTypes[type] || 0)}
                      </EssenceAmount>
                      <EssenceDescription>
                        {config.description}
                      </EssenceDescription>
                    </EssenceCard>
                  );
                })}
              </EssenceGrid>

              {/* Bonuses Section */}
              <BonusSection>
                <BonusTitle>
                  <IconSparkles size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {t('essenceTap.essenceTypes.bonuses', { defaultValue: 'Type Bonuses' })}
                </BonusTitle>
                <BonusList>
                  <BonusItem $active={(essenceTypes.pure || 0) >= 1000000}>
                    <BonusLabel>
                      <BonusIcon $color="#A855F7"><IconGem size={12} /></BonusIcon>
                      <BonusName>Pure Clicker (1M Pure)</BonusName>
                    </BonusLabel>
                    <BonusValue $active={(essenceTypes.pure || 0) >= 1000000}>
                      +10% Click Power
                    </BonusValue>
                  </BonusItem>

                  <BonusItem $active={(essenceTypes.ambient || 0) >= 10000000}>
                    <BonusLabel>
                      <BonusIcon $color="#3B82F6"><IconSparkles size={12} /></BonusIcon>
                      <BonusName>Passive Master (10M Ambient)</BonusName>
                    </BonusLabel>
                    <BonusValue $active={(essenceTypes.ambient || 0) >= 10000000}>
                      +15% Generator Output
                    </BonusValue>
                  </BonusItem>

                  <BonusItem $active={(essenceTypes.golden || 0) >= 100000}>
                    <BonusLabel>
                      <BonusIcon $color="#FCD34D"><IconStar size={12} /></BonusIcon>
                      <BonusName>Golden Touch (100K Golden)</BonusName>
                    </BonusLabel>
                    <BonusValue $active={(essenceTypes.golden || 0) >= 100000}>
                      +0.1% Golden Chance
                    </BonusValue>
                  </BonusItem>

                  <BonusItem $active={(essenceTypes.prismatic || 0) >= 10000}>
                    <BonusLabel>
                      <BonusIcon $color="#EC4899"><IconDiamond size={12} /></BonusIcon>
                      <BonusName>Prismatic Power (10K Prismatic)</BonusName>
                    </BonusLabel>
                    <BonusValue $active={(essenceTypes.prismatic || 0) >= 10000}>
                      +25% All Production
                    </BonusValue>
                  </BonusItem>
                </BonusList>
              </BonusSection>
            </>
          )}
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

EssenceTypesDisplay.displayName = 'EssenceTypesDisplay';

export default EssenceTypesDisplay;
