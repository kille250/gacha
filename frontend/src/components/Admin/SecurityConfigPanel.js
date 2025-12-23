/**
 * SecurityConfigPanel.js
 * 
 * Read-only view of all security configuration settings.
 * Displays current values grouped by category.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaCog, FaSync, FaShieldAlt, FaClock, FaRobot, 
  FaGavel, FaEyeSlash, FaEdit 
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getSecurityConfig } from '../../utils/api';
import {
  HeaderRow,
  SectionTitle,
  SecondaryButton,
} from './AdminStyles';

const CATEGORY_ICONS = {
  risk_thresholds: FaShieldAlt,
  rate_limits: FaClock,
  captcha: FaRobot,
  policies: FaGavel,
  enforcement: FaEyeSlash
};

const CATEGORY_LABELS = {
  risk_thresholds: 'Risk Scoring',
  rate_limits: 'Rate Limits',
  captcha: 'CAPTCHA Settings',
  policies: 'Policy Settings',
  enforcement: 'Enforcement Penalties'
};

const CATEGORY_COLORS = {
  risk_thresholds: '#ff9500',
  rate_limits: '#007aff',
  captcha: '#5856d6',
  policies: '#34c759',
  enforcement: '#ff3b30'
};

const SecurityConfigPanel = ({ onEdit }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSecurityConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch security config:', err);
      setError('Failed to load security configuration');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  
  const formatValue = (key, value) => {
    // Format milliseconds as human readable
    if (key.includes('WINDOW') || key.includes('VALIDITY')) {
      const ms = parseInt(value, 10);
      if (ms >= 86400000) return `${ms / 86400000} day(s)`;
      if (ms >= 3600000) return `${ms / 3600000} hour(s)`;
      if (ms >= 60000) return `${ms / 60000} minute(s)`;
      if (ms >= 1000) return `${ms / 1000} second(s)`;
      return `${ms}ms`;
    }
    
    // Format multipliers as percentages
    if (key.includes('MULTIPLIER')) {
      return `${(parseFloat(value) * 100).toFixed(0)}%`;
    }
    
    // Format durations
    if (key.includes('DURATION') && typeof value === 'string') {
      return value;
    }
    
    return String(value);
  };
  
  const formatKeyName = (key) => {
    return key
      .replace(/^(RISK_THRESHOLD_|RATE_LIMIT_|CAPTCHA_|POLICY_|SHADOWBAN_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <FaSync className="spin" /> Loading configuration...
      </LoadingContainer>
    );
  }
  
  if (error) {
    return (
      <ErrorContainer>
        {error}
        <SecondaryButton onClick={fetchConfig}>
          <FaSync /> Retry
        </SecondaryButton>
      </ErrorContainer>
    );
  }
  
  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaCog /> {t('admin.security.configuration', 'Security Configuration')}
        </SectionTitle>
        <HeaderActions>
          <SecondaryButton onClick={fetchConfig}>
            <FaSync />
          </SecondaryButton>
          {onEdit && (
            <EditButton onClick={onEdit}>
              <FaEdit /> Edit Settings
            </EditButton>
          )}
        </HeaderActions>
      </HeaderRow>
      
      <ConfigGrid>
        {config?.config && Object.entries(config.config).map(([category, items]) => {
          const Icon = CATEGORY_ICONS[category] || FaCog;
          const label = CATEGORY_LABELS[category] || category;
          const color = CATEGORY_COLORS[category] || theme.colors.primary;
          
          return (
            <CategoryCard
              key={category}
              variants={motionVariants.staggerItem}
              $color={color}
            >
              <CategoryHeader $color={color}>
                <Icon />
                <span>{label}</span>
              </CategoryHeader>
              
              <ConfigList>
                {items.map((item) => (
                  <ConfigItem key={item.key}>
                    <ConfigName>{formatKeyName(item.key)}</ConfigName>
                    <ConfigValue>{formatValue(item.key, item.value)}</ConfigValue>
                    {item.description && (
                      <ConfigDescription>{item.description}</ConfigDescription>
                    )}
                  </ConfigItem>
                ))}
              </ConfigList>
            </CategoryCard>
          );
        })}
      </ConfigGrid>
      
      {config?.lastUpdated && (
        <LastUpdated>
          Last refreshed: {new Date(config.lastUpdated).toLocaleString()}
        </LastUpdated>
      )}
    </Container>
  );
};

const Container = styled(motion.div)``;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.error};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.primaryHover};
  }
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${theme.spacing.lg};
`;

const CategoryCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  
  &::before {
    content: '';
    display: block;
    height: 3px;
    background: ${props => props.$color};
  }
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.lg};
  color: ${props => props.$color};
  
  svg {
    font-size: 20px;
  }
`;

const ConfigList = styled.div`
  padding: ${theme.spacing.md};
`;

const ConfigItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.md};
  
  &:hover {
    background: ${theme.colors.backgroundTertiary};
  }
`;

const ConfigName = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

const ConfigValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.primary};
  font-weight: ${theme.fontWeights.bold};
  font-family: monospace;
`;

const ConfigDescription = styled.div`
  width: 100%;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

const LastUpdated = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
`;

export default SecurityConfigPanel;

