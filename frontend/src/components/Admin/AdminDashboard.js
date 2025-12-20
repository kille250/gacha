import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaUsers, FaImage, FaFlag, FaTicketAlt, FaCoins, FaFish, FaPlus, FaCloudUploadAlt, FaDownload } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';

const AdminDashboard = ({ stats, onQuickAction }) => {
  const statCards = [
    { 
      id: 'users', 
      label: 'Total Users', 
      value: stats.totalUsers || 0, 
      icon: FaUsers, 
      color: '#0a84ff',
      gradient: 'linear-gradient(135deg, #0a84ff, #5e5ce6)'
    },
    { 
      id: 'characters', 
      label: 'Characters', 
      value: stats.totalCharacters || 0, 
      icon: FaImage, 
      color: '#30d158',
      gradient: 'linear-gradient(135deg, #30d158, #34c759)'
    },
    { 
      id: 'banners', 
      label: 'Active Banners', 
      value: stats.activeBanners || 0, 
      icon: FaFlag, 
      color: '#ff9f0a',
      gradient: 'linear-gradient(135deg, #ff9f0a, #ff6b35)'
    },
    { 
      id: 'coupons', 
      label: 'Active Coupons', 
      value: stats.activeCoupons || 0, 
      icon: FaTicketAlt, 
      color: '#bf5af2',
      gradient: 'linear-gradient(135deg, #bf5af2, #ff2d55)'
    },
    { 
      id: 'coins', 
      label: 'Total Coins', 
      value: stats.totalCoins?.toLocaleString() || 0, 
      icon: FaCoins, 
      color: '#ffd60a',
      gradient: 'linear-gradient(135deg, #ffd60a, #ff9f0a)'
    },
    { 
      id: 'fish', 
      label: 'Fish Caught', 
      value: stats.totalFish?.toLocaleString() || 0, 
      icon: FaFish, 
      color: '#64d2ff',
      gradient: 'linear-gradient(135deg, #64d2ff, #0a84ff)'
    },
  ];

  const quickActions = [
    { id: 'addCharacter', label: 'Add Character', icon: FaPlus, action: 'character' },
    { id: 'multiUpload', label: 'Multi Upload', icon: FaCloudUploadAlt, action: 'multiUpload' },
    { id: 'animeImport', label: 'Anime Import', icon: FaDownload, action: 'animeImport' },
    { id: 'addBanner', label: 'New Banner', icon: FaFlag, action: 'banner' },
    { id: 'addCoupon', label: 'New Coupon', icon: FaTicketAlt, action: 'coupon' },
  ];

  return (
    <DashboardContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <SectionTitle>
        <TitleIcon>📊</TitleIcon>
        Overview
      </SectionTitle>
      
      <StatsGrid>
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={stat.id}
              variants={motionVariants.staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              $gradient={stat.gradient}
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
      
      <SectionTitle style={{ marginTop: theme.spacing.xl }}>
        <TitleIcon>⚡</TitleIcon>
        Quick Actions
      </SectionTitle>
      
      <QuickActionsGrid>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <QuickActionButton
              key={action.id}
              onClick={() => onQuickAction(action.action)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <QuickActionIcon><Icon /></QuickActionIcon>
              <span>{action.label}</span>
            </QuickActionButton>
          );
        })}
      </QuickActionsGrid>
      
      <RecentActivitySection>
        <SectionTitle>
          <TitleIcon>🕐</TitleIcon>
          System Status
        </SectionTitle>
        <StatusGrid>
          <StatusCard>
            <StatusIndicator $active={true} />
            <StatusText>
              <strong>Database</strong>
              <span>Connected</span>
            </StatusText>
          </StatusCard>
          <StatusCard>
            <StatusIndicator $active={true} />
            <StatusText>
              <strong>File Storage</strong>
              <span>Available</span>
            </StatusText>
          </StatusCard>
          <StatusCard>
            <StatusIndicator $active={stats.totalUsers > 0} />
            <StatusText>
              <strong>Users Online</strong>
              <span>{stats.totalUsers > 0 ? 'Active' : 'None'}</span>
            </StatusText>
          </StatusCard>
        </StatusGrid>
      </RecentActivitySection>
    </DashboardContainer>
  );
};

const DashboardContainer = styled(motion.div)`
  padding: 0 ${theme.spacing.md};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.lg};
  color: ${theme.colors.text};
`;

const TitleIcon = styled.span`
  font-size: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
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
  cursor: default;
  
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
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  font-size: 20px;
  margin-bottom: ${theme.spacing.md};
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
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const StatGlow = styled.div`
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: ${props => props.$color}15;
  border-radius: 50%;
  filter: blur(20px);
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const QuickActionButton = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surface};
    border-color: ${theme.colors.primary};
  }
`;

const QuickActionIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: 20px;
`;

const RecentActivitySection = styled.div`
  margin-top: ${theme.spacing.xl};
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

const StatusCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const StatusIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$active ? theme.colors.success : theme.colors.error};
  box-shadow: 0 0 8px ${props => props.$active ? theme.colors.success : theme.colors.error}80;
`;

const StatusText = styled.div`
  display: flex;
  flex-direction: column;
  
  strong {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.text};
  }
  
  span {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textSecondary};
  }
`;

export default AdminDashboard;

