/**
 * DojoHeader - Page header with navigation and stats
 *
 * Displays back button, title, and user points.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdArrowBack } from 'react-icons/md';
import { FaCoins } from 'react-icons/fa';

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

const DojoHeader = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Header>
      <HeaderInner>
        <BackButton
          onClick={() => navigate(-1)}
          aria-label={t('common.back') || 'Go back'}
        >
          <MdArrowBack aria-hidden="true" />
        </BackButton>
        <HeaderContent>
          <HeaderIcon aria-hidden="true">🏯</HeaderIcon>
          <HeaderTitle>{t('dojo.title')}</HeaderTitle>
        </HeaderContent>
        <HeaderStats>
          <StatBadge aria-label={`${user?.points?.toLocaleString() || 0} ${t('common.points')}`}>
            <FaCoins aria-hidden="true" />
            <span>{user?.points?.toLocaleString() || 0}</span>
          </StatBadge>
        </HeaderStats>
      </HeaderInner>
    </Header>
  );
};

export default DojoHeader;
