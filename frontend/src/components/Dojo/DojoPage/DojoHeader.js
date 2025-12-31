/**
 * DojoHeader - Page header with navigation and stats
 *
 * Displays back button, title, user points, and account level badge.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdArrowBack } from 'react-icons/md';
import { FaCoins } from 'react-icons/fa';
import { AnimatePresence } from 'framer-motion';
import { IconDojo } from '../../../constants/icons';

import {
  Header,
  HeaderInner,
  BackButton,
  HeaderContent,
  HeaderIcon,
  HeaderTitle,
  HeaderStats,
  StatBadge,
} from './DojoPage.styles';
import { AccountLevelBadge, AccountLevelCard } from '../../AccountLevel';
import { useAccountLevel } from '../../../hooks/useGameEnhancements';
import { Modal } from '../../../design-system';

const DojoHeader = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountLevel, loading: levelLoading } = useAccountLevel();
  const [showLevelModal, setShowLevelModal] = useState(false);

  return (
    <>
      <Header>
        <HeaderInner>
          <BackButton
            onClick={() => navigate(-1)}
            aria-label={t('common.back') || 'Go back'}
          >
            <MdArrowBack aria-hidden="true" />
          </BackButton>
          <HeaderContent>
            <HeaderIcon aria-hidden="true"><IconDojo /></HeaderIcon>
            <HeaderTitle>{t('dojo.title')}</HeaderTitle>
          </HeaderContent>
          <HeaderStats>
            {!levelLoading && accountLevel && (
              <AccountLevelBadge
                level={accountLevel.level}
                progress={accountLevel.progress}
                onClick={() => setShowLevelModal(true)}
              />
            )}
            <StatBadge aria-label={`${user?.points?.toLocaleString() || 0} ${t('common.points')}`}>
              <FaCoins aria-hidden="true" />
              <span>{user?.points?.toLocaleString() || 0}</span>
            </StatBadge>
          </HeaderStats>
        </HeaderInner>
      </Header>

      {/* Account Level Modal */}
      <AnimatePresence>
        {showLevelModal && accountLevel && (
          <Modal
            isOpen={showLevelModal}
            onClose={() => setShowLevelModal(false)}
            title={t('accountLevel.title', 'Account Level')}
          >
            <AccountLevelCard
              level={accountLevel.level}
              xp={accountLevel.xp}
              xpToNext={accountLevel.xpToNext}
              xpInLevel={accountLevel.xpInLevel}
              xpNeededForLevel={accountLevel.xpNeededForLevel}
              progress={accountLevel.progress}
              isMaxLevel={accountLevel.isMaxLevel}
              upcomingUnlocks={accountLevel.upcomingUnlocks}
            />
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

export default DojoHeader;
