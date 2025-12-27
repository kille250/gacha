/**
 * AccountLevelBadge - Displays account level with XP progress
 *
 * A compact badge component showing the player's current account level
 * and progress toward the next level.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa';

const BadgeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(88, 86, 214, 0.15);
  border: 1px solid rgba(88, 86, 214, 0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(88, 86, 214, 0.25);
    border-color: rgba(88, 86, 214, 0.5);
    transform: translateY(-1px);
  }
`;

const LevelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
  border-radius: 50%;
  color: white;
  font-size: 12px;
`;

const LevelInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const LevelText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
`;

const ProgressBar = styled.div`
  width: 50px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #5856d6 0%, #af52de 100%);
  border-radius: 2px;
`;

const AccountLevelBadge = ({ level = 1, progress = 0, onClick }) => {
  const { t } = useTranslation();

  return (
    <BadgeContainer
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={t('accountLevel.badge', { level, progress: Math.round(progress * 100) })}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <LevelIcon>
        <FaStar aria-hidden="true" />
      </LevelIcon>
      <LevelInfo>
        <LevelText>Lv. {level}</LevelText>
        <ProgressBar
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('accountLevel.progressLabel', 'Level progress')}
        >
          <ProgressFill
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </ProgressBar>
      </LevelInfo>
    </BadgeContainer>
  );
};

export default AccountLevelBadge;
