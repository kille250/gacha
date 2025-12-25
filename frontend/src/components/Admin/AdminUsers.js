/**
 * AdminUsers - User management component for the admin interface
 *
 * Features:
 * - Responsive design: Table on desktop, cards on mobile
 * - User search and filtering
 * - Coin management
 * - Toggle controls for autofish and R18 access
 * - Security actions via modal
 *
 * @accessibility
 * - Proper ARIA labels on interactive elements
 * - Screen reader announcements for toggles
 * - Keyboard navigable
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaCoins, FaSearch, FaCrown, FaShieldAlt, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
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
} from './AdminStyles';
import UserSecurityModal from './UserSecurityModal';

const AdminUsers = ({ users, coinForm, onCoinFormChange, onAddCoins, onToggleAutofish, onToggleR18, onSecurityAction }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Restriction color mapping using theme colors
  const restrictionColors = {
    perm_ban: theme.colors.error,
    temp_ban: theme.colors.warning,
    shadowban: theme.colors.textMuted,
    rate_limited: theme.colors.accentSecondary,
    warning: theme.colors.featured
  };

  const getRestrictionBadge = (user) => {
    if (user.restrictionType && user.restrictionType !== 'none') {
      return {
        type: user.restrictionType,
        color: restrictionColors[user.restrictionType] || theme.colors.textMuted
      };
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

  // Render a user row for desktop
  const renderUserRow = (user, index) => {
    const rank = index + 1;
    const isTopTen = rank <= 10;
    const badge = getRestrictionBadge(user);

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
            {isTopTen && <FaCrown aria-hidden="true" />}
            <span>#{rank}</span>
          </RankBadge>
        </Cell>
        <Cell>
          <UserInfo>
            <Username>{user.username}</Username>
            {user.isAdmin && <AdminBadge>{t('admin.isAdmin')}</AdminBadge>}
          </UserInfo>
        </Cell>
        <Cell $width="120px">
          <CoinDisplay>
            <FaCoins color={theme.colors.featured} aria-hidden="true" />
            <span>{user.points?.toLocaleString()}</span>
          </CoinDisplay>
        </Cell>
        <Cell $width="100px">
          {badge ? (
            <RestrictionBadge $color={badge.color} aria-label={`Status: ${badge.type.replace('_', ' ')}`}>
              {badge.type.replace('_', ' ')}
            </RestrictionBadge>
          ) : user.riskScore >= 50 ? (
            <RiskBadge aria-label={`Risk score: ${user.riskScore}`}>
              <FaExclamationTriangle aria-hidden="true" /> {user.riskScore}
            </RiskBadge>
          ) : (
            <StatusOK aria-label="No issues"><FaCheck /></StatusOK>
          )}
        </Cell>
        <Cell $width="80px">
          <StatusIcon aria-label={user.isAdmin ? 'Administrator' : 'Regular user'}>
            {user.isAdmin ? (
              <FaCheck style={{ color: theme.colors.success }} />
            ) : (
              <FaTimes style={{ color: theme.colors.error }} />
            )}
          </StatusIcon>
        </Cell>
        <Cell $width="120px">
          <ToggleButton
            $enabled={user.allowR18}
            onClick={() => onToggleR18(user.id, !user.allowR18)}
            aria-pressed={user.allowR18}
            aria-label={`R18 access for ${user.username}: ${user.allowR18 ? 'enabled' : 'disabled'}`}
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
              aria-pressed={user.autofishEnabled}
              aria-label={`Autofish for ${user.username}: ${user.autofishEnabled ? 'enabled' : 'disabled'}`}
            >
              {user.autofishEnabled ? t('admin.autofishManual') : t('admin.autofishEnable')}
            </ToggleButton>
          </AutofishCell>
        </Cell>
        <Cell $width="80px">
          <SecurityButton
            onClick={() => setSelectedUserId(user.id)}
            aria-label={`Security actions for ${user.username}`}
          >
            <FaShieldAlt />
          </SecurityButton>
        </Cell>
      </TableRow>
    );
  };

  // Render a user card for mobile
  const renderUserCard = (user, index) => {
    const rank = index + 1;
    const isTopTen = rank <= 10;
    const badge = getRestrictionBadge(user);

    return (
      <MobileUserCard
        key={user.id}
        variants={motionVariants.staggerItem}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        $isTopTen={isTopTen}
      >
        <CardHeader>
          <RankBadge $isTopTen={isTopTen}>
            {isTopTen && <FaCrown aria-hidden="true" />}
            <span>#{rank}</span>
          </RankBadge>
          <UserInfo>
            <Username>{user.username}</Username>
            {user.isAdmin && <AdminBadge>{t('admin.isAdmin')}</AdminBadge>}
          </UserInfo>
          <SecurityButton
            onClick={() => setSelectedUserId(user.id)}
            aria-label={`Security actions for ${user.username}`}
          >
            <FaShieldAlt />
          </SecurityButton>
        </CardHeader>

        <CardStats>
          <StatItem>
            <StatLabel>{t('admin.coins')}</StatLabel>
            <CoinDisplay>
              <FaCoins color={theme.colors.featured} aria-hidden="true" />
              <span>{user.points?.toLocaleString()}</span>
            </CoinDisplay>
          </StatItem>
          <StatItem>
            <StatLabel>{t('admin.security.status')}</StatLabel>
            {badge ? (
              <RestrictionBadge $color={badge.color}>
                {badge.type.replace('_', ' ')}
              </RestrictionBadge>
            ) : user.riskScore >= 50 ? (
              <RiskBadge>
                <FaExclamationTriangle /> {user.riskScore}
              </RiskBadge>
            ) : (
              <StatusOK><FaCheck /></StatusOK>
            )}
          </StatItem>
        </CardStats>

        <CardToggles>
          <ToggleRow>
            <ToggleLabel>{t('admin.r18')}</ToggleLabel>
            <ToggleButton
              $enabled={user.allowR18}
              onClick={() => onToggleR18(user.id, !user.allowR18)}
              aria-pressed={user.allowR18}
            >
              {user.allowR18 ? t('admin.r18Enabled') : t('admin.r18DisabledShort')}
            </ToggleButton>
          </ToggleRow>
          <ToggleRow>
            <ToggleLabel>
              {t('admin.autofish')}
              {isTopTen && <TopTenBadge>{t('admin.topTen')}</TopTenBadge>}
            </ToggleLabel>
            <ToggleButton
              $enabled={user.autofishEnabled}
              onClick={() => onToggleAutofish(user.id, !user.autofishEnabled)}
              aria-pressed={user.autofishEnabled}
            >
              {user.autofishEnabled ? t('admin.autofishManual') : t('admin.autofishEnable')}
            </ToggleButton>
          </ToggleRow>
        </CardToggles>
      </MobileUserCard>
    );
  };

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaUsers aria-hidden="true" /> {t('admin.userManagement')}
          <ItemCount>{users.length} users</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SearchWrapper>
            <FaSearch aria-hidden="true" />
            <SearchInput
              type="search"
              placeholder={t('admin.searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('admin.searchUsers')}
            />
          </SearchWrapper>
          <ActionButton
            $variant="gold"
            onClick={() => setShowCoinModal(true)}
            aria-label={t('admin.addCoins')}
          >
            <FaCoins aria-hidden="true" /> {t('admin.addCoins')}
          </ActionButton>
        </HeaderActions>
      </HeaderRow>

      {/* Desktop Table View */}
      <UsersTable role="table" aria-label={t('admin.userManagement')}>
        <TableHeader role="rowgroup">
          <HeaderCell $width="60px" role="columnheader">{t('admin.rank')}</HeaderCell>
          <HeaderCell role="columnheader">{t('admin.username')}</HeaderCell>
          <HeaderCell $width="120px" role="columnheader">{t('admin.coins')}</HeaderCell>
          <HeaderCell $width="100px" role="columnheader">{t('admin.security.status')}</HeaderCell>
          <HeaderCell $width="80px" role="columnheader">{t('admin.isAdmin')}</HeaderCell>
          <HeaderCell $width="120px" role="columnheader">{t('admin.r18')}</HeaderCell>
          <HeaderCell $width="150px" role="columnheader">{t('admin.autofish')}</HeaderCell>
          <HeaderCell $width="80px" role="columnheader">{t('admin.security.actions')}</HeaderCell>
        </TableHeader>

        <TableBody role="rowgroup">
          <AnimatePresence>
            {filteredUsers.map((user, index) => renderUserRow(user, index))}
          </AnimatePresence>
        </TableBody>
      </UsersTable>

      {/* Mobile Card View */}
      <MobileUserList aria-label={t('admin.userManagement')}>
        <AnimatePresence>
          {filteredUsers.map((user, index) => renderUserCard(user, index))}
        </AnimatePresence>
      </MobileUserList>
      
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

// Desktop table - hidden on mobile
const UsersTable = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

// Mobile card list - hidden on desktop
const MobileUserList = styled.div`
  display: none;

  @media (max-width: ${theme.breakpoints.md}) {
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
  }
`;

const TableHeader = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
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
  background: ${props => props.$isTopTen ? `${theme.colors.featured}08` : 'transparent'};
  transition: background ${theme.transitions.fast};

  &:hover { background: ${theme.colors.backgroundTertiary}; }
  &:last-child { border-bottom: none; }
`;

const Cell = styled.div`
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
  min-width: 0;
`;

// ============================================
// MOBILE CARD COMPONENTS
// ============================================

const MobileUserCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  ${props => props.$isTopTen && css`
    border-color: ${theme.colors.featured}40;
    background: linear-gradient(135deg, ${theme.colors.featured}08 0%, transparent 100%);
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const CardStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardToggles = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.sm};
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ToggleLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const RankBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isTopTen ? theme.colors.featured : theme.colors.textSecondary};

  svg { font-size: 12px; }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;
  min-width: 0;
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AdminBadge = styled.span`
  padding: 2px 8px;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.textOnPrimary};
  flex-shrink: 0;
`;

const CoinDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const StatusIcon = styled.span`
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AutofishCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const TopTenBadge = styled.span`
  padding: 2px 8px;
  background: ${theme.colors.featured}20;
  border: 1px solid ${theme.colors.featured}40;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.featured};
  flex-shrink: 0;
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
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.warning};
`;

const StatusOK = styled.span`
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  display: flex;
  align-items: center;
`;

const SecurityButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.warningMuted};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.warning};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.warning}30;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const CoinSubmitButton = styled(PrimaryButton)`
  width: 100%;
  background: linear-gradient(135deg, ${theme.colors.featured}, ${theme.colors.warning});
  color: ${theme.colors.textInverse};

  &:hover {
    background: linear-gradient(135deg, ${theme.colors.featuredHover}, ${theme.colors.warningHover});
  }
`;

// PropTypes for type checking and documentation
AdminUsers.propTypes = {
  /** Array of user objects to display */
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string.isRequired,
    points: PropTypes.number,
    isAdmin: PropTypes.bool,
    allowR18: PropTypes.bool,
    autofishEnabled: PropTypes.bool,
    riskScore: PropTypes.number,
    restrictionType: PropTypes.oneOf(['none', 'perm_ban', 'temp_ban', 'shadowban', 'rate_limited', 'warning']),
  })).isRequired,
  /** Current coin form values */
  coinForm: PropTypes.shape({
    userId: PropTypes.string,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  /** Handler for coin form input changes */
  onCoinFormChange: PropTypes.func.isRequired,
  /** Handler for adding coins (receives form submit event) */
  onAddCoins: PropTypes.func.isRequired,
  /** Handler for toggling autofish (userId, enabled) */
  onToggleAutofish: PropTypes.func.isRequired,
  /** Handler for toggling R18 access (userId, enabled) */
  onToggleR18: PropTypes.func.isRequired,
  /** Callback when a security action completes successfully */
  onSecurityAction: PropTypes.func,
};

AdminUsers.defaultProps = {
  onSecurityAction: null,
};

export default AdminUsers;
