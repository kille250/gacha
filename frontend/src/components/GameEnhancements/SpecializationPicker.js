/**
 * SpecializationPicker - Character specialization selection
 *
 * Allows players to choose a permanent specialization
 * for their characters to enhance specific stats.
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { GiCrossedSwords, GiBookCover, GiSparkles } from 'react-icons/gi';
import { useTranslation } from 'react-i18next';
import { useCharacterSpecialization, useDojoFacility } from '../../hooks/useGameEnhancements';
import { getAssetUrl } from '../../utils/api';
import { PLACEHOLDER_IMAGE, isVideo } from '../../utils/mediaUtils';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
`;

const CharacterInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
`;

const CharacterAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: ${props => props.$rarity === 'legendary'
    ? 'linear-gradient(135deg, #ffd700 0%, #ffab00 100%)'
    : props.$rarity === 'epic'
    ? 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)'
    : 'linear-gradient(135deg, #2196f3 0%, #03a9f4 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  overflow: hidden;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CharacterDetails = styled.div`
  flex: 1;
`;

const CharacterName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
`;

const CharacterSeries = styled.div`
  color: #888;
  font-size: 0.8rem;
`;

const CurrentSpec = styled.div`
  color: ${props => props.$hasSpec ? '#4caf50' : '#888'};
  font-size: 0.75rem;
  margin-top: 4px;
`;

const WarningBanner = styled.div`
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  color: #ff9800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SpecGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
`;

const SpecCard = styled(motion.div)`
  background: ${props => props.$selected
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$selected
    ? '#4caf50'
    : props.$locked
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 16px;
  cursor: ${props => props.$locked ? 'default' : 'pointer'};
  opacity: ${props => props.$locked ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover {
    ${props => !props.$locked && `
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    `}
  }
`;

const SpecIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 12px;
  text-align: center;
`;

const SpecName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 8px;
`;

const SpecBonus = styled.div`
  color: #4caf50;
  font-size: 0.8rem;
  text-align: center;
  margin-bottom: 4px;
`;

const SpecDesc = styled.div`
  color: #888;
  font-size: 0.75rem;
  text-align: center;
`;

const LockedBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  color: #666;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  text-align: center;
  margin-top: 8px;
`;

const ConfirmSection = styled(motion.div)`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ConfirmText = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 16px;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled(motion.button)`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
`;

const ConfirmButton = styled(Button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: #fff;
`;

const CancelButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LoadingSpinner = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
  margin-right: 8px;
`;

const ErrorBanner = styled.div`
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  color: #f44336;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  color: #888;
`;

// Backend specialization IDs: strength, wisdom, spirit
const SPECIALIZATION_DATA = {
  strength: {
    Icon: GiCrossedSwords,
    nameKey: 'specialization.strength.name',
    bonusKey: 'specialization.strength.bonus',
    descKey: 'specialization.strength.description',
    unlockLevel: 1
  },
  wisdom: {
    Icon: GiBookCover,
    nameKey: 'specialization.wisdom.name',
    bonusKey: 'specialization.wisdom.bonus',
    descKey: 'specialization.wisdom.description',
    unlockLevel: 1
  },
  spirit: {
    Icon: GiSparkles,
    nameKey: 'specialization.spirit.name',
    bonusKey: 'specialization.spirit.bonus',
    descKey: 'specialization.spirit.description',
    unlockLevel: 1
  }
};

/**
 * Get full image URL for character, handling both imageUrl and image fields
 */
const getCharacterImageUrl = (char) => {
  const imagePath = char?.imageUrl || char?.image;
  if (!imagePath) return null;
  return getAssetUrl(imagePath);
};

export function SpecializationPicker({ character, userLevel = 1, onClose }) {
  const { t } = useTranslation();
  const { specialization, loading, error, applying, applySpecialization } = useCharacterSpecialization(character?.id);
  const { facility, loading: facilityLoading } = useDojoFacility();
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const hasExistingSpec = !!specialization?.current;

  // Handle image error by falling back to placeholder
  const handleImageError = useCallback((e) => {
    if (!e.target.src.includes('data:image/svg') && !e.target.src.includes('placeholder')) {
      e.target.src = PLACEHOLDER_IMAGE;
    }
  }, []);

  // Check if specializations feature is unlocked (requires warriors_hall or higher)
  const hasSpecializationsFeature = facility?.current?.features?.includes('specializations') ?? false;

  const handleSelect = (specId) => {
    if (hasExistingSpec || applying || !hasSpecializationsFeature) return;

    setSelected(specId);
    setConfirming(true);
    setApplyError(null);
  };

  const handleConfirm = async () => {
    if (!selected || applying) return;

    try {
      setApplyError(null);
      await applySpecialization(selected);
      // Pass true to trigger a refresh of the parent's status
      onClose?.(true);
    } catch (err) {
      console.error('Failed to apply specialization:', err);
      setApplyError(err.response?.data?.error || err.message || t('specialization.applyError'));
    }
  };

  const handleCancel = () => {
    if (applying) return;
    setSelected(null);
    setConfirming(false);
    setApplyError(null);
  };

  if (loading || facilityLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size={24} />
          <span>{t('specialization.loading')}</span>
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Header>
        <Title>{t('specialization.title')}</Title>
      </Header>

      <CharacterInfo>
        <CharacterAvatar $rarity={character?.rarity}>
          {(() => {
            const imageSrc = getCharacterImageUrl(character);
            const charIsVideo = isVideo(character?.imageUrl || character?.image);

            if (charIsVideo && imageSrc) {
              return (
                <video
                  src={imageSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={handleImageError}
                />
              );
            }
            if (imageSrc) {
              return (
                <img
                  src={imageSrc}
                  alt={character?.name || 'Character'}
                  onError={handleImageError}
                />
              );
            }
            return <FaUser size={32} />;
          })()}
        </CharacterAvatar>
        <CharacterDetails>
          <CharacterName>{character?.name || 'Unknown Character'}</CharacterName>
          <CharacterSeries>{character?.series || 'Unknown Series'}</CharacterSeries>
          <CurrentSpec $hasSpec={hasExistingSpec}>
            {hasExistingSpec
              ? t('specialization.current', { name: t(SPECIALIZATION_DATA[specialization.current]?.nameKey) || specialization.current })
              : t('specialization.none')}
          </CurrentSpec>
        </CharacterDetails>
      </CharacterInfo>

      {(error || applyError) && (
        <ErrorBanner>
          <FaExclamationTriangle />
          <span>{applyError || error}</span>
        </ErrorBanner>
      )}

      {!hasSpecializationsFeature ? (
        <WarningBanner>
          {t('specialization.requiresFacility')}
        </WarningBanner>
      ) : hasExistingSpec ? (
        <WarningBanner>
          {t('specialization.alreadyHasWarning')}
        </WarningBanner>
      ) : (
        <WarningBanner>
          {t('specialization.permanentWarning')}
        </WarningBanner>
      )}

      <SpecGrid>
        {Object.entries(SPECIALIZATION_DATA).map(([id, spec]) => {
          const isLocked = !hasSpecializationsFeature;
          const isSelected = selected === id;
          const isCurrentSpec = specialization?.current === id;

          return (
            <SpecCard
              key={id}
              $selected={isSelected || isCurrentSpec}
              $locked={isLocked || hasExistingSpec}
              onClick={() => handleSelect(id)}
              whileHover={!isLocked && !hasExistingSpec ? { scale: 1.02 } : {}}
              whileTap={!isLocked && !hasExistingSpec ? { scale: 0.98 } : {}}
            >
              <SpecIcon><spec.Icon size={40} /></SpecIcon>
              <SpecName>{t(spec.nameKey)}</SpecName>
              <SpecBonus>{t(spec.bonusKey)}</SpecBonus>
              <SpecDesc>{t(spec.descKey)}</SpecDesc>
              {isLocked && !isCurrentSpec && (
                <LockedBadge>{t('specialization.requiresFacilityShort')}</LockedBadge>
              )}
              {isCurrentSpec && (
                <LockedBadge style={{ background: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}>
                  {t('specialization.currentBadge')}
                </LockedBadge>
              )}
            </SpecCard>
          );
        })}
      </SpecGrid>

      <AnimatePresence>
        {confirming && selected && (
          <ConfirmSection
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ConfirmText>
              {t('specialization.confirmApply', { name: t(SPECIALIZATION_DATA[selected].nameKey) })}
              <br />
              <span style={{ color: '#ff9800' }}>{t('specialization.permanentAction')}</span>
            </ConfirmText>
            <ButtonGroup>
              <CancelButton
                onClick={handleCancel}
                disabled={applying}
                whileHover={!applying ? { scale: 1.02 } : {}}
                whileTap={!applying ? { scale: 0.98 } : {}}
                style={{ opacity: applying ? 0.5 : 1, cursor: applying ? 'not-allowed' : 'pointer' }}
              >
                {t('common.cancel')}
              </CancelButton>
              <ConfirmButton
                onClick={handleConfirm}
                disabled={applying}
                whileHover={!applying ? { scale: 1.02 } : {}}
                whileTap={!applying ? { scale: 0.98 } : {}}
                style={{ opacity: applying ? 0.7 : 1, cursor: applying ? 'not-allowed' : 'pointer' }}
              >
                {applying && <LoadingSpinner size={14} />}
                {applying ? t('specialization.applying') : t('common.confirm')}
              </ConfirmButton>
            </ButtonGroup>
          </ConfirmSection>
        )}
      </AnimatePresence>
    </Container>
  );
}

export default SpecializationPicker;
