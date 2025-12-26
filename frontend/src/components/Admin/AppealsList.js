/**
 * AppealsList.js
 * 
 * List of pending appeals with review actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGavel, FaSync, FaCheck, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getPendingAppeals, getAppealStats } from '../../utils/api';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
} from './Admin.styles';

const AppealsList = ({ onReviewAppeal }) => {
  const { t } = useTranslation();
  const [appeals, setAppeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appealsData, statsData] = await Promise.all([
        getPendingAppeals({ limit: 50 }),
        getAppealStats()
      ]);
      setAppeals(appealsData.appeals || []);
      setStats(statsData);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.security.fetchAppealsError', 'Failed to load appeals'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);
  
  const getRestrictionColor = (type) => {
    switch (type) {
      case 'perm_ban': return '#ff3b30';
      case 'temp_ban': return '#ff9500';
      case 'shadowban': return '#8e8e93';
      case 'rate_limited': return '#af52de';
      default: return theme.colors.textSecondary;
    }
  };
  
  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return t('admin.security.justNow');
    if (diffHours < 24) return `${diffHours}h ${t('admin.security.ago')}`;
    return `${Math.floor(diffHours / 24)}d ${t('admin.security.ago')}`;
  };
  
  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaGavel /> {t('admin.security.appeals')}
          <ItemCount>{appeals.length} {t('admin.security.pending')}</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SecondaryButton onClick={fetchAppeals} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} />
          </SecondaryButton>
        </HeaderActions>
      </HeaderRow>
      
      {/* Stats Row */}
      {stats && (
        <StatsRow>
          <StatBadge>
            <StatLabel>{t('admin.security.pending')}</StatLabel>
            <StatValue $color="#007aff">{stats.pending}</StatValue>
          </StatBadge>
          <StatBadge>
            <StatLabel>{t('admin.security.approved')}</StatLabel>
            <StatValue $color="#34c759">{stats.approved}</StatValue>
          </StatBadge>
          <StatBadge>
            <StatLabel>{t('admin.security.denied')}</StatLabel>
            <StatValue $color="#ff3b30">{stats.denied}</StatValue>
          </StatBadge>
          <StatBadge>
            <StatLabel>{t('admin.security.approvalRate')}</StatLabel>
            <StatValue $color="#ff9500">{stats.approvalRate}%</StatValue>
          </StatBadge>
        </StatsRow>
      )}
      
      <AppealsTable>
        <TableHeader>
          <HeaderCell $width="60px">#</HeaderCell>
          <HeaderCell>{t('admin.username')}</HeaderCell>
          <HeaderCell $width="120px">{t('admin.security.restrictionType')}</HeaderCell>
          <HeaderCell>{t('admin.security.appealText')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.submitted')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.actions')}</HeaderCell>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <LoadingRow>
              <FaSync className="spin" /> {t('common.loading')}
            </LoadingRow>
          ) : error ? (
            <ErrorRow>
              {error}
            </ErrorRow>
          ) : appeals.length === 0 ? (
            <EmptyRow>
              <FaCheck /> {t('admin.security.noAppeals')}
            </EmptyRow>
          ) : (
            <AnimatePresence>
              {appeals.map((appeal, index) => (
                <TableRow
                  key={appeal.id}
                  variants={motionVariants.staggerItem}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Cell $width="60px">#{index + 1}</Cell>
                  <Cell>
                    <UserInfo>
                      <Username>{appeal.user?.username || `User ${appeal.userId}`}</Username>
                      {appeal.user?.warningCount > 0 && (
                        <WarningBadge>⚠️ {appeal.user.warningCount}</WarningBadge>
                      )}
                    </UserInfo>
                  </Cell>
                  <Cell $width="120px">
                    <RestrictionBadge $color={getRestrictionColor(appeal.restrictionType)}>
                      {appeal.restrictionType}
                    </RestrictionBadge>
                  </Cell>
                  <Cell>
                    <AppealText>
                      {appeal.appealText?.substring(0, 100)}
                      {appeal.appealText?.length > 100 && '...'}
                    </AppealText>
                  </Cell>
                  <Cell $width="100px">
                    <TimeAgo>{formatTimestamp(appeal.createdAt)}</TimeAgo>
                  </Cell>
                  <Cell $width="100px">
                    <ActionButtons>
                      <ActionButton 
                        $variant="primary"
                        onClick={() => onReviewAppeal(appeal)}
                        title={t('admin.security.review')}
                      >
                        <FaEye />
                      </ActionButton>
                    </ActionButtons>
                  </Cell>
                </TableRow>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </AppealsTable>
    </Container>
  );
};

const Container = styled(motion.div)``;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.lg};
`;

const StatBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  min-width: 100px;
`;

const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const StatValue = styled.span`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
`;

const AppealsTable = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const HeaderCell = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
`;

const TableBody = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const TableRow = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  transition: background ${theme.transitions.fast};
  
  &:hover { background: ${theme.colors.backgroundTertiary}; }
  &:last-child { border-bottom: none; }
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-wrap: wrap;
  }
`;

const Cell = styled.div`
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
  min-width: 0;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const EmptyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.success};
`;

const ErrorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const WarningBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
`;

const RestrictionBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const AppealText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.4;
`;

const TimeAgo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  border: none;
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  background: ${props => 
    props.$variant === 'approve' ? 'rgba(52, 199, 89, 0.15)' :
    props.$variant === 'deny' ? 'rgba(255, 59, 48, 0.15)' :
    'rgba(0, 122, 255, 0.15)'
  };
  color: ${props => 
    props.$variant === 'approve' ? '#34c759' :
    props.$variant === 'deny' ? '#ff3b30' :
    '#007aff'
  };
  
  &:hover {
    background: ${props => 
      props.$variant === 'approve' ? 'rgba(52, 199, 89, 0.25)' :
      props.$variant === 'deny' ? 'rgba(255, 59, 48, 0.25)' :
      'rgba(0, 122, 255, 0.25)'
    };
  }
`;

export default AppealsList;

