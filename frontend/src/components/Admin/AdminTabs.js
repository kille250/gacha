import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaChartBar, FaUsers, FaImage, FaFlag, FaTicketAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/DesignSystem';

const TAB_CONFIG = [
  { id: 'dashboard', labelKey: 'admin.tabs.dashboard', icon: FaChartBar },
  { id: 'users', labelKey: 'admin.tabs.users', icon: FaUsers },
  { id: 'characters', labelKey: 'admin.tabs.characters', icon: FaImage },
  { id: 'banners', labelKey: 'admin.tabs.banners', icon: FaFlag },
  { id: 'coupons', labelKey: 'admin.tabs.coupons', icon: FaTicketAlt },
];

const AdminTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  return (
    <TabsContainer>
      <TabsList>
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TabButton
              key={tab.id}
              $isActive={isActive}
              onClick={() => onTabChange(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon />
              <span>{t(tab.labelKey)}</span>
              {isActive && <ActiveIndicator layoutId="activeTab" />}
            </TabButton>
          );
        })}
      </TabsList>
    </TabsContainer>
  );
};

const TabsContainer = styled.nav`
  position: sticky;
  top: 70px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} 0;
  margin-bottom: ${theme.spacing.xl};
`;

const TabsList = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  overflow-x: auto;
  padding: 0 ${theme.spacing.md};
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    justify-content: center;
    gap: ${theme.spacing.sm};
  }
`;

const TabButton = styled(motion.button)`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$isActive ? theme.colors.surface : 'transparent'};
  border: 1px solid ${props => props.$isActive ? theme.colors.primary : 'transparent'};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  
  svg {
    font-size: 16px;
  }
  
  &:hover {
    color: ${theme.colors.text};
    background: ${props => props.$isActive ? theme.colors.surface : 'rgba(255,255,255,0.05)'};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    
    span {
      display: none;
    }
    
    svg {
      font-size: 20px;
    }
  }
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
`;

export default AdminTabs;