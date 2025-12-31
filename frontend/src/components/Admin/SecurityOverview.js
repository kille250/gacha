/**
 * SecurityOverview.js
 * 
 * Dashboard cards showing security statistics and restriction counts.
 */
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  FaBan, FaClock, FaEyeSlash, FaExclamationTriangle,
  FaShieldAlt, FaUserShield, FaGavel
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { IconWarning } from '../../constants/icons';

const SecurityOverview = ({ data, appealStats, onViewHighRisk, onViewAppeals }) => {
  const { t } = useTranslation();
  
  if (!data) return null;
  
  const { restrictions, thresholds } = data;
  
  const statCards = [
    { 
      id: 'permBanned', 
      label: t('admin.security.permBanned'),
      value: restrictions?.permBanned || 0, 
      icon: FaBan, 
      color: '#ff3b30',
      gradient: 'linear-gradient(135deg, #ff3b30, #ff6b6b)'
    },
    { 
      id: 'tempBanned', 
      label: t('admin.security.tempBanned'),
      value: restrictions?.tempBanned || 0, 
      icon: FaClock, 
      color: '#ff9500',
      gradient: 'linear-gradient(135deg, #ff9500, #ffcc00)'
    },
    { 
      id: 'shadowbanned', 
      label: t('admin.security.shadowbanned'),
      value: restrictions?.shadowbanned || 0, 
      icon: FaEyeSlash, 
      color: '#8e8e93',
      gradient: 'linear-gradient(135deg, #8e8e93, #636366)'
    },
    { 
      id: 'rateLimited', 
      label: t('admin.security.rateLimited'),
      value: restrictions?.rateLimited || 0, 
      icon: FaShieldAlt, 
      color: '#af52de',
      gradient: 'linear-gradient(135deg, #af52de, #bf5af2)'
    },
    { 
      id: 'warnings', 
      label: t('admin.security.totalWarnings'),
      value: restrictions?.totalWarnings || 0, 
      icon: FaExclamationTriangle, 
      color: '#ffcc00',
      gradient: 'linear-gradient(135deg, #ffcc00, #ff9f0a)'
    },
    { 
      id: 'pendingAppeals', 
      label: t('admin.security.pendingAppeals'),
      value: appealStats?.pending || 0, 
      icon: FaGavel, 
      color: '#007aff',
      gradient: 'linear-gradient(135deg, #007aff, #5ac8fa)'
    },
  ];

  return (
    <OverviewContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <StatsGrid>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isClickable = stat.id === 'pendingAppeals';
          return (
            <StatCard
              key={stat.id}
              variants={motionVariants.staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              $gradient={stat.gradient}
              $clickable={isClickable}
              onClick={isClickable ? onViewAppeals : undefined}
            >
              <StatIcon $color={stat.color}>
                <Icon />
              </StatIcon>
              <StatContent>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </StatContent>
              <StatGlow $color={stat.color} />
            </StatCard>
          );
        })}
      </StatsGrid>
      
      {/* High Risk Users Section */}
      <HighRiskSection>
        <SectionHeader>
          <SectionTitle>
            <FaUserShield /> {t('admin.security.highRiskUsers')}
          </SectionTitle>
          <ViewAllButton onClick={onViewHighRisk}>
            {t('admin.security.viewAll')} →
          </ViewAllButton>
        </SectionHeader>
        
        {data.highRiskUsers && data.highRiskUsers.length > 0 ? (
          <HighRiskList>
            {data.highRiskUsers.slice(0, 5).map((user) => (
              <HighRiskItem key={user.id}>
                <UserInfo>
                  <Username>{user.username}</Username>
                  <RiskScore $score={user.riskScore}>
                    {user.riskScore}
                  </RiskScore>
                </UserInfo>
                <WarningCount>
                  {user.warningCount > 0 && (
                    <span><IconWarning /> {user.warningCount}</span>
                  )}
                </WarningCount>
              </HighRiskItem>
            ))}
          </HighRiskList>
        ) : (
          <EmptyState>
            <FaShieldAlt />
            <span>{t('admin.security.noHighRiskUsers')}</span>
          </EmptyState>
        )}
        
        <ThresholdsInfo>
          <ThresholdItem>
            <ThresholdLabel>{t('admin.security.monitoring')}</ThresholdLabel>
            <ThresholdValue>{thresholds?.MONITORING || 30}+</ThresholdValue>
          </ThresholdItem>
          <ThresholdItem>
            <ThresholdLabel>{t('admin.security.softRestriction')}</ThresholdLabel>
            <ThresholdValue>{thresholds?.SOFT_RESTRICTION || 50}+</ThresholdValue>
          </ThresholdItem>
          <ThresholdItem>
            <ThresholdLabel>{t('admin.security.shadowban')}</ThresholdLabel>
            <ThresholdValue>{thresholds?.SHADOWBAN || 70}+</ThresholdValue>
          </ThresholdItem>
          <ThresholdItem>
            <ThresholdLabel>{t('admin.security.tempBan')}</ThresholdLabel>
            <ThresholdValue>{thresholds?.TEMP_BAN || 85}+</ThresholdValue>
          </ThresholdItem>
        </ThresholdsInfo>
      </HighRiskSection>
    </OverviewContainer>
  );
};

const OverviewContainer = styled(motion.div)`
  margin-bottom: ${theme.spacing.xl};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const StatCard = styled(motion.div)`
  position: relative;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  overflow: hidden;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$gradient};
  }
`;

const StatIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  font-size: 18px;
  margin-bottom: ${theme.spacing.sm};
`;

const StatContent = styled.div`
  position: relative;
  z-index: 1;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const StatGlow = styled.div`
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 60px;
  height: 60px;
  background: ${props => props.$color}15;
  border-radius: 50%;
  filter: blur(20px);
`;

const HighRiskSection = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.warning}; }
`;

const ViewAllButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  
  &:hover { text-decoration: underline; }
`;

const HighRiskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const HighRiskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
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

const RiskScore = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  background: ${props => {
    if (props.$score >= 70) return 'rgba(255, 59, 48, 0.15)';
    if (props.$score >= 50) return 'rgba(255, 149, 0, 0.15)';
    return 'rgba(255, 204, 0, 0.15)';
  }};
  color: ${props => {
    if (props.$score >= 70) return '#ff3b30';
    if (props.$score >= 50) return '#ff9500';
    return '#ffcc00';
  }};
`;

const WarningCount = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  
  svg { color: ${theme.colors.success}; }
`;

const ThresholdsInfo = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const ThresholdItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const ThresholdLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const ThresholdValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

export default SecurityOverview;

