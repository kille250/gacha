/**
 * RiskDecayPanel.js
 * 
 * Panel for managing risk score decay with statistics.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaChartLine, FaSync, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/DesignSystem';
import { triggerRiskScoreDecay, getRiskStats } from '../../utils/api';
import { PrimaryButton, SecondaryButton, Select } from './AdminStyles';

const DECAY_OPTIONS = [
  { value: 0.05, label: '5% decay' },
  { value: 0.1, label: '10% decay (recommended)' },
  { value: 0.15, label: '15% decay' },
  { value: 0.2, label: '20% decay' },
  { value: 0.25, label: '25% decay' }
];

const RiskDecayPanel = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decayPercentage, setDecayPercentage] = useState(0.1);
  const [decaying, setDecaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastDecay, setLastDecay] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRiskStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch risk stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDecay = async () => {
    setDecaying(true);
    try {
      const result = await triggerRiskScoreDecay(decayPercentage);
      setLastDecay({
        count: result.decayedCount,
        percentage: result.decayPercentage,
        timestamp: new Date().toISOString()
      });
      if (onSuccess) onSuccess(result.message);
      setShowConfirm(false);
      fetchStats();
    } catch (err) {
      console.error('Failed to decay risk scores:', err);
    } finally {
      setDecaying(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <FaChartLine /> {t('admin.security.riskScoreManagement')}
        </Title>
        <RefreshButton onClick={fetchStats} disabled={loading}>
          <FaSync className={loading ? 'spin' : ''} />
        </RefreshButton>
      </Header>

      {loading ? (
        <LoadingText>{t('admin.security.loadingStats')}</LoadingText>
      ) : stats ? (
        <>
          <StatsGrid>
            <StatCard>
              <StatLabel>{t('admin.security.averageScore')}</StatLabel>
              <StatValue $color={getScoreColor(stats.avgScore)}>
                {stats.avgScore}
              </StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t('admin.security.maxScore')}</StatLabel>
              <StatValue $color={getScoreColor(stats.maxScore)}>
                {stats.maxScore}
              </StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t('admin.security.monitoringCount')}</StatLabel>
              <StatValue $warning={stats.distribution.monitoring > 0}>
                {stats.distribution.monitoring}
              </StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t('admin.security.elevatedCount')}</StatLabel>
              <StatValue $warning={stats.distribution.elevated > 0}>
                {stats.distribution.elevated}
              </StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t('admin.security.highRiskCount')}</StatLabel>
              <StatValue $danger={stats.distribution.high > 0}>
                {stats.distribution.high}
              </StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>{t('admin.security.criticalCount')}</StatLabel>
              <StatValue $danger={stats.distribution.critical > 0}>
                {stats.distribution.critical}
              </StatValue>
            </StatCard>
          </StatsGrid>

          <DecaySection>
            <DecayHeader>
              <DecayTitle>{t('admin.security.riskScoreDecay')}</DecayTitle>
              <DecayDescription>
                {t('admin.security.decayDescription')}
              </DecayDescription>
            </DecayHeader>

            {lastDecay && (
              <LastDecayInfo>
                <FaCheckCircle />
                {t('admin.security.lastDecay')}: {lastDecay.count} {t('admin.security.usersReduced')} {lastDecay.percentage * 100}%
                <span> ({new Date(lastDecay.timestamp).toLocaleTimeString()})</span>
              </LastDecayInfo>
            )}

            {!showConfirm ? (
              <DecayControls>
                <Select
                  value={decayPercentage}
                  onChange={(e) => setDecayPercentage(parseFloat(e.target.value))}
                >
                  {DECAY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                <PrimaryButton
                  onClick={() => setShowConfirm(true)}
                  disabled={stats.distribution.monitoring === 0}
                >
                  {t('admin.security.applyDecay')}
                </PrimaryButton>
              </DecayControls>
            ) : (
              <ConfirmSection>
                <WarningIcon>
                  <FaExclamationTriangle />
                </WarningIcon>
                <ConfirmText>
                  {t('admin.security.decayConfirmText', { count: stats.distribution.monitoring, percent: decayPercentage * 100 })}
                </ConfirmText>
                <ConfirmButtons>
                  <SecondaryButton onClick={() => setShowConfirm(false)}>
                    {t('common.cancel')}
                  </SecondaryButton>
                  <DangerButton onClick={handleDecay} disabled={decaying}>
                    {decaying ? t('admin.security.applying') : t('admin.security.confirmDecay')}
                  </DangerButton>
                </ConfirmButtons>
              </ConfirmSection>
            )}
          </DecaySection>
        </>
      ) : (
        <ErrorText>{t('admin.security.failedLoadStats')}</ErrorText>
      )}
    </Container>
  );
};

const getScoreColor = (score) => {
  if (score >= 70) return '#ff3b30';
  if (score >= 50) return '#ff9500';
  if (score >= 30) return '#ffcc00';
  return theme.colors.success;
};

const Container = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.primary}; }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    color: ${theme.colors.text};
    background: ${theme.colors.surfaceBorder};
  }
  
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const ErrorText = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => 
    props.$color ? props.$color :
    props.$danger ? '#ff3b30' :
    props.$warning ? '#ff9500' :
    theme.colors.text
  };
`;

const DecaySection = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
`;

const DecayHeader = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const DecayTitle = styled.h4`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.xs} 0;
`;

const DecayDescription = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const LastDecayInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(52, 199, 89, 0.15);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.success};
  
  svg { flex-shrink: 0; }
  span { color: ${theme.colors.textSecondary}; }
`;

const DecayControls = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;
  
  select {
    flex: 1;
    max-width: 250px;
  }
`;

const ConfirmSection = styled.div`
  text-align: center;
`;

const WarningIcon = styled.div`
  font-size: 32px;
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.md};
`;

const ConfirmText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg};
  
  strong { color: ${theme.colors.primary}; }
`;

const ConfirmButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.md};
`;

const DangerButton = styled(PrimaryButton)`
  background: ${theme.colors.error};
  
  &:hover:not(:disabled) {
    background: #e0342a;
  }
`;

export default RiskDecayPanel;

