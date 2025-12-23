import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdClose, MdSettings } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../../../styles/DesignSystem';
import {
  CozyModal, ModalTitle, CloseButton,
  EquipmentTabs, EquipmentTab, EquipmentList, EquipmentCard,
  EquipmentIcon, EquipmentInfo, EquipmentName, EquipmentDesc, EquipmentBonus,
  RodBonuses, CurrentBadge, SelectButton, BuyButton, UnlockButton, LockedBadge,
} from '../FishingStyles';

/**
 * Equipment Modal - Areas and Rods management
 */
export const EquipmentModal = ({ 
  show, 
  onClose, 
  areas,
  rods,
  equipmentTab,
  setEquipmentTab,
  equipmentActionLoading,
  userPoints,
  onSelectArea,
  onUnlockArea,
  onEquipRod,
  onBuyRod,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <ModalOverlay
          variants={motionVariants.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <CozyModal variants={motionVariants.modal}>
            <ModalHeader>
              <ModalTitle>
                <MdSettings style={{ marginRight: '8px' }} />
                {t('fishing.equipment') || 'Equipment'}
              </ModalTitle>
              <CloseButton onClick={onClose}><MdClose /></CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Tab Selector */}
              <EquipmentTabs>
                <EquipmentTab 
                  $active={equipmentTab === 'areas'} 
                  onClick={() => setEquipmentTab('areas')}
                >
                  🏞️ {t('fishing.areas') || 'Areas'}
                </EquipmentTab>
                <EquipmentTab 
                  $active={equipmentTab === 'rods'} 
                  onClick={() => setEquipmentTab('rods')}
                >
                  🎣 {t('fishing.rods') || 'Rods'}
                </EquipmentTab>
              </EquipmentTabs>
              
              {/* Areas Tab */}
              {equipmentTab === 'areas' && areas && (
                <EquipmentList>
                  {areas.areas.map(area => (
                    <EquipmentCard 
                      key={area.id}
                      $unlocked={area.unlocked}
                      $current={area.current}
                    >
                      <EquipmentIcon>{area.emoji}</EquipmentIcon>
                      <EquipmentInfo>
                        <EquipmentName>{area.name}</EquipmentName>
                        <EquipmentDesc>{area.description}</EquipmentDesc>
                        {area.rarityBonus > 0 && (
                          <EquipmentBonus>+{Math.round(area.rarityBonus * 100)}% {t('fishing.rareChance') || 'rare chance'}</EquipmentBonus>
                        )}
                      </EquipmentInfo>
                      {area.current ? (
                        <CurrentBadge>{t('fishing.current') || 'Current'}</CurrentBadge>
                      ) : area.unlocked ? (
                        <SelectButton 
                          onClick={() => onSelectArea(area.id)}
                          disabled={equipmentActionLoading}
                        >
                          {equipmentActionLoading ? '...' : (t('fishing.select') || 'Select')}
                        </SelectButton>
                      ) : (
                        <UnlockButton
                          onClick={() => onUnlockArea(area.id)}
                          disabled={equipmentActionLoading || !area.canUnlock}
                          $canAfford={userPoints >= area.unlockCost}
                        >
                          <span>🪙 {area.unlockCost.toLocaleString()}</span>
                          {area.unlockRank && <span style={{ fontSize: '10px', opacity: 0.8 }}>{t('fishing.rankRequired', { rank: area.unlockRank })}</span>}
                        </UnlockButton>
                      )}
                    </EquipmentCard>
                  ))}
                </EquipmentList>
              )}
              
              {/* Rods Tab */}
              {equipmentTab === 'rods' && rods && (
                <EquipmentList>
                  {rods.rods.map(rod => (
                    <EquipmentCard 
                      key={rod.id}
                      $unlocked={rod.owned}
                      $current={rod.equipped}
                      $locked={rod.locked}
                    >
                      <EquipmentIcon>{rod.emoji}</EquipmentIcon>
                      <EquipmentInfo>
                        <EquipmentName>{rod.name}</EquipmentName>
                        <EquipmentDesc>{rod.description}</EquipmentDesc>
                        <RodBonuses>
                          {rod.timingBonus > 0 && <span>⏱️ +{rod.timingBonus}ms</span>}
                          {rod.rarityBonus > 0 && <span>✨ +{Math.round(rod.rarityBonus * 100)}%</span>}
                          {rod.perfectBonus > 0 && <span>⭐ +{Math.round(rod.perfectBonus * 100)}%</span>}
                        </RodBonuses>
                      </EquipmentInfo>
                      {rod.equipped ? (
                        <CurrentBadge>{t('fishing.equipped') || 'Equipped'}</CurrentBadge>
                      ) : rod.owned ? (
                        <SelectButton 
                          onClick={() => onEquipRod(rod.id)}
                          disabled={equipmentActionLoading}
                        >
                          {equipmentActionLoading ? '...' : (t('fishing.equip') || 'Equip')}
                        </SelectButton>
                      ) : rod.locked ? (
                        <LockedBadge>🔒 {t('fishing.prestigeRequired', { level: rod.requiresPrestige })}</LockedBadge>
                      ) : (
                        <BuyButton 
                          onClick={() => onBuyRod(rod.id)}
                          disabled={equipmentActionLoading || !rod.canBuy}
                        >
                          {equipmentActionLoading ? '...' : `🪙 ${rod.cost.toLocaleString()}`}
                        </BuyButton>
                      )}
                    </EquipmentCard>
                  ))}
                </EquipmentList>
              )}
            </ModalBody>
          </CozyModal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default EquipmentModal;

