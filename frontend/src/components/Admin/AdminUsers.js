import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaCoins, FaSearch, FaCrown } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';

const AdminUsers = ({ users, coinForm, onCoinFormChange, onAddCoins, onToggleAutofish, onToggleR18, coinMessage }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoinModal, setShowCoinModal] = useState(false);
  
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <UsersContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaUsers /> {t('admin.userManagement')}
          <UserCount>{users.length} users</UserCount>
        </SectionTitle>
        <HeaderActions>
          <SearchWrapper>
            <FaSearch />
            <SearchInput 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchWrapper>
          <AddCoinsButton onClick={() => setShowCoinModal(true)}>
            <FaCoins /> Add Coins
          </AddCoinsButton>
        </HeaderActions>
      </HeaderRow>
      
      <UsersTable>
        <TableHeader>
          <HeaderCell $width="60px">Rank</HeaderCell>
          <HeaderCell>Username</HeaderCell>
          <HeaderCell $width="120px">Coins</HeaderCell>
          <HeaderCell $width="80px">Admin</HeaderCell>
          <HeaderCell $width="120px">R18</HeaderCell>
          <HeaderCell $width="150px">Autofish</HeaderCell>
          <HeaderCell $width="120px">Joined</HeaderCell>
        </TableHeader>
        
        <TableBody>
          <AnimatePresence>
            {filteredUsers.map((user, index) => {
              const rank = index + 1;
              const isTopTen = rank <= 10;
              const canAutofish = user.autofishEnabled || isTopTen;
              
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
                  <Cell $width="80px">
                    <StatusIcon $active={user.isAdmin}>{user.isAdmin ? '✅' : '❌'}</StatusIcon>
                  </Cell>
                  <Cell $width="120px">
                    <ToggleButton 
                      $enabled={user.allowR18}
                      onClick={() => onToggleR18(user.id, !user.allowR18)}
                    >
                      {user.allowR18 ? '🔞 Enabled' : 'Disabled'}
                    </ToggleButton>
                  </Cell>
                  <Cell $width="150px">
                    <AutofishCell>
                      {isTopTen && <TopTenBadge>Top 10</TopTenBadge>}
                      <ToggleButton 
                        $enabled={user.autofishEnabled}
                        onClick={() => onToggleAutofish(user.id, !user.autofishEnabled)}
                      >
                        {user.autofishEnabled ? 'Manual ✓' : 'Enable'}
                      </ToggleButton>
                    </AutofishCell>
                  </Cell>
                  <Cell $width="120px">
                    <DateText>{new Date(user.createdAt).toLocaleDateString()}</DateText>
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
            onClick={() => setShowCoinModal(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle><FaCoins /> {t('admin.addCoins')}</ModalTitle>
                <CloseButton onClick={() => setShowCoinModal(false)}>×</CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={(e) => { onAddCoins(e); setShowCoinModal(false); }}>
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
                  <SubmitButton type="submit">
                    <FaCoins /> {t('admin.addCoins')}
                  </SubmitButton>
                </form>
                {coinMessage && <SuccessMessage>{coinMessage}</SuccessMessage>}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </UsersContainer>
  );
};

const UsersContainer = styled(motion.div)`
  padding: 0 ${theme.spacing.md};
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  color: ${theme.colors.text};
  
  svg { color: ${theme.colors.primary}; }
`;

const UserCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.backgroundTertiary};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  margin-left: ${theme.spacing.sm};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-width: 200px;
  
  svg { color: ${theme.colors.textMuted}; font-size: 14px; }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  flex: 1;
  outline: none;
  
  &::placeholder { color: ${theme.colors.textMuted}; }
`;

const AddCoinsButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, #ffd60a, #ff9f0a);
  border: none;
  border-radius: ${theme.radius.lg};
  color: #1a1a1a;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover { opacity: 0.9; transform: translateY(-1px); }
`;

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

const ToggleButton = styled.button`
  padding: 4px 12px;
  border: none;
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  background: ${props => props.$enabled ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$enabled ? '#30d158' : theme.colors.textSecondary};
  border: 1px solid ${props => props.$enabled ? 'rgba(48, 209, 88, 0.3)' : theme.colors.surfaceBorder};
  
  &:hover { opacity: 0.8; }
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

const DateText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 420px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ModalTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  
  svg { color: #ffd60a; }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  
  &:hover { color: ${theme.colors.text}; }
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #ffd60a, #ff9f0a);
  border: none;
  border-radius: ${theme.radius.lg};
  color: #1a1a1a;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  
  &:hover { opacity: 0.9; }
`;

const SuccessMessage = styled.p`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(48, 209, 88, 0.15);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

export default AdminUsers;

