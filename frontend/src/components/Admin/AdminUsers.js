import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaCoins, FaSearch, FaCrown, FaShieldAlt } from 'react-icons/fa';
import { theme, motionVariants } from '../../design-system';
import { useTranslation } from 'react-i18next';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  HeaderActions,
  SearchWrapper,
  SearchInput,
  ActionButton,
  ToggleButton,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  Input,
  Select,
  PrimaryButton,
  SuccessMessage,
} from './AdminStyles';
import UserSecurityModal from './UserSecurityModal';

const AdminUsers = ({ users, coinForm, onCoinFormChange, onAddCoins, onToggleAutofish, onToggleR18, coinMessage, onSecurityAction }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getRestrictionBadge = (user) => {
    if (user.restrictionType && user.restrictionType !== 'none') {
      const colors = {
        perm_ban: '#ff3b30',
        temp_ban: '#ff9500',
        shadowban: '#8e8e93',
        rate_limited: '#af52de',
        warning: '#ffcc00'
      };
      return { type: user.restrictionType, color: colors[user.restrictionType] || '#8e8e93' };
    }
    return null;
  };
  
  const handleSecuritySuccess = (message) => {
    if (onSecurityAction) onSecurityAction(message);
    setSelectedUserId(null);
  };

  const handleAddCoinsSubmit = (e) => {
    onAddCoins(e);
    setShowCoinModal(false);
  };

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaUsers /> {t('admin.userManagement')}
          <ItemCount>{users.length} users</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SearchWrapper>
            <FaSearch />
            <SearchInput 
              type="text" 
              placeholder={t('admin.searchUsers')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchWrapper>
          <ActionButton $variant="gold" onClick={() => setShowCoinModal(true)}>
            <FaCoins /> {t('admin.addCoins')}
          </ActionButton>
        </HeaderActions>
      </HeaderRow>
      
      <UsersTable>
        <TableHeader>
          <HeaderCell $width="60px">{t('admin.rank')}</HeaderCell>
          <HeaderCell>{t('admin.username')}</HeaderCell>
          <HeaderCell $width="120px">{t('admin.coins')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.status')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.isAdmin')}</HeaderCell>
          <HeaderCell $width="120px">{t('admin.r18')}</HeaderCell>
          <HeaderCell $width="150px">{t('admin.autofish')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.actions')}</HeaderCell>
        </TableHeader>
        
        <TableBody>
          <AnimatePresence>
            {filteredUsers.map((user, index) => {
              const rank = index + 1;
              const isTopTen = rank <= 10;
              
              return (
                <TableRow 
                  key={user.id}
                  variants={motionVariants.staggerItem}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -20 }}
                  $isTopTen={isTopTen}
                >
                  <Cell $width="60px">
                    <RankBadge $isTopTen={isTopTen}>
                      {isTopTen && <FaCrown />}
                      #{rank}
                    </RankBadge>
                  </Cell>
                  <Cell>
                    <UserInfo>
                      <Username>{user.username}</Username>
                      {user.isAdmin && <AdminBadge>Admin</AdminBadge>}
                    </UserInfo>
                  </Cell>
                  <Cell $width="120px">
                    <CoinDisplay>
                      <FaCoins color="#ffd60a" />
                      {user.points?.toLocaleString()}
                    </CoinDisplay>
                  </Cell>
                  <Cell $width="100px">
                    {(() => {
                      const badge = getRestrictionBadge(user);
                      if (badge) {
                        return (
                          <RestrictionBadge $color={badge.color}>
                            {badge.type.replace('_', ' ')}
                          </RestrictionBadge>
                        );
                      }
                      if (user.riskScore >= 50) {
                        return <RiskBadge>⚠️ {user.riskScore}</RiskBadge>;
                      }
                      return <StatusOK>✓</StatusOK>;
                    })()}
                  </Cell>
                  <Cell $width="80px">
                    <StatusIcon>{user.isAdmin ? '✅' : '❌'}</StatusIcon>
                  </Cell>
                  <Cell $width="120px">
                    <ToggleButton 
                      $enabled={user.allowR18}
                      onClick={() => onToggleR18(user.id, !user.allowR18)}
                    >
                      {user.allowR18 ? t('admin.r18Enabled') : t('admin.r18DisabledShort')}
                    </ToggleButton>
                  </Cell>
                  <Cell $width="150px">
                    <AutofishCell>
                      {isTopTen && <TopTenBadge>{t('admin.topTen')}</TopTenBadge>}
                      <ToggleButton 
                        $enabled={user.autofishEnabled}
                        onClick={() => onToggleAutofish(user.id, !user.autofishEnabled)}
                      >
                        {user.autofishEnabled ? t('admin.autofishManual') : t('admin.autofishEnable')}
                      </ToggleButton>
                    </AutofishCell>
                  </Cell>
                  <Cell $width="80px">
                    <SecurityButton onClick={() => setSelectedUserId(user.id)}>
                      <FaShieldAlt />
                    </SecurityButton>
                  </Cell>
                </TableRow>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </UsersTable>
      
      {/* Add Coins Modal */}
      <AnimatePresence>
        {showCoinModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCoinModal(false); }}
          >
            <ModalContent
              $maxWidth="420px"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <ModalHeader>
                <ModalTitle $iconColor="#ffd60a"><FaCoins /> {t('admin.addCoins')}</ModalTitle>
                <CloseButton onClick={() => setShowCoinModal(false)}>×</CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleAddCoinsSubmit}>
                  <FormGroup>
                    <Label>{t('admin.selectUser')}</Label>
                    <Select name="userId" value={coinForm.userId} onChange={onCoinFormChange} required>
                      <option value="">{t('admin.selectUserPlaceholder')}</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.points} coins)</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.amount')}</Label>
                    <Input 
                      type="number" 
                      name="amount" 
                      min="1" 
                      max="10000" 
                      value={coinForm.amount} 
                      onChange={onCoinFormChange} 
                      required 
                    />
                  </FormGroup>
                  <CoinSubmitButton type="submit">
                    <FaCoins /> {t('admin.addCoins')}
                  </CoinSubmitButton>
                </form>
                {coinMessage && <SuccessMessage>{coinMessage}</SuccessMessage>}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* User Security Modal */}
      <UserSecurityModal
        show={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onSuccess={handleSecuritySuccess}
      />
    </AdminContainer>
  );
};

// ============================================
// USER-SPECIFIC STYLED COMPONENTS
// ============================================

const UsersTable = styled.div`
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
  max-height: 600px;
  overflow-y: auto;
`;

const TableRow = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${props => props.$isTopTen ? 'rgba(255, 215, 0, 0.03)' : 'transparent'};
  transition: background ${theme.transitions.fast};
  
  &:hover { background: ${theme.colors.backgroundTertiary}; }
  &:last-child { border-bottom: none; }
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
  }
`;

const Cell = styled.div`
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
  min-width: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex: ${props => props.$width ? `0 0 calc(50% - 8px)` : '0 0 100%'};
  }
`;

const RankBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isTopTen ? '#ffd60a' : theme.colors.textSecondary};
  
  svg { font-size: 12px; }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const AdminBadge = styled.span`
  padding: 2px 8px;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

const CoinDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-weight: ${theme.fontWeights.semibold};
`;

const StatusIcon = styled.span`
  font-size: 16px;
`;

const AutofishCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const TopTenBadge = styled.span`
  padding: 2px 8px;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: #ffd60a;
`;

const RestrictionBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const RiskBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: #ff9500;
`;

const StatusOK = styled.span`
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
`;

const SecurityButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background: rgba(255, 149, 0, 0.15);
  border: none;
  border-radius: ${theme.radius.md};
  color: #ff9500;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(255, 149, 0, 0.25);
  }
`;

const CoinSubmitButton = styled(PrimaryButton)`
  width: 100%;
  background: linear-gradient(135deg, #ffd60a, #ff9f0a);
  color: #1a1a1a;
`;

export default AdminUsers;
