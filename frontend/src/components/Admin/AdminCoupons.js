import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaPlus, FaEdit, FaTrash, FaCoins, FaUsers, FaCalendarAlt, FaCopy } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
} from './AdminStyles';

const AdminCoupons = ({ 
  coupons, 
  onAddCoupon, 
  onEditCoupon, 
  onDeleteCoupon 
}) => {
  const { t } = useTranslation();
  
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
  };
  
  const activeCoupons = coupons.filter(c => c.isActive);
  const expiredCoupons = coupons.filter(c => !c.isActive);

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.accent}>
          <FaTicketAlt /> {t('admin.couponManagement')}
          <ItemCount>{coupons.length} coupons</ItemCount>
        </SectionTitle>
        <AddCouponButton onClick={onAddCoupon} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <FaPlus /> {t('admin.createCoupon')}
        </AddCouponButton>
      </HeaderRow>
      
      <StatsRow>
        <MiniStat>
          <MiniStatValue>{activeCoupons.length}</MiniStatValue>
          <MiniStatLabel>{t('admin.activeCount')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue>{expiredCoupons.length}</MiniStatValue>
          <MiniStatLabel>{t('admin.expiredCount')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue>{coupons.reduce((sum, c) => sum + c.currentUses, 0)}</MiniStatValue>
          <MiniStatLabel>{t('admin.totalUses')}</MiniStatLabel>
        </MiniStat>
      </StatsRow>
      
      {coupons.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎫</EmptyIcon>
          <EmptyText>{t('admin.noCouponsYet')}</EmptyText>
          <EmptySubtext>{t('admin.createDiscountCodes')}</EmptySubtext>
          <AddCouponButton onClick={onAddCoupon} style={{ marginTop: theme.spacing.lg }}>
            <FaPlus /> {t('admin.createCoupon')}
          </AddCouponButton>
        </EmptyState>
      ) : (
        <CouponGrid>
          <AnimatePresence mode="popLayout">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                variants={motionVariants.card}
                initial="hidden"
                animate="visible"
                exit="exit"
                whileHover={{ y: -4 }}
                layout
                $active={coupon.isActive}
              >
                <CardHeader>
                  <CouponCode>
                    <code>{coupon.code}</code>
                    <CopyButton onClick={() => copyToClipboard(coupon.code)} title="Copy code">
                      <FaCopy />
                    </CopyButton>
                  </CouponCode>
                  <StatusDot $active={coupon.isActive} />
                </CardHeader>
                
                <CardBody>
                  {coupon.description && (
                    <Description>{coupon.description}</Description>
                  )}
                  
                  <RewardTag $type={coupon.type}>
                    {coupon.type === 'coins' ? (
                      <>
                        <FaCoins />
                        <span>{coupon.value} Coins</span>
                      </>
                    ) : (
                      <>
                        <FaUsers />
                        <span>{coupon.Character?.name || 'Character'}</span>
                      </>
                    )}
                  </RewardTag>
                  
                  <DetailsGrid>
                    <DetailItem>
                      <DetailLabel>{t('admin.uses')}</DetailLabel>
                      <DetailValue>
                        {coupon.currentUses} / {coupon.maxUses === -1 ? '∞' : coupon.maxUses}
                      </DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>{t('admin.perUser')}</DetailLabel>
                      <DetailValue>
                        {coupon.usesPerUser === -1 ? '∞' : coupon.usesPerUser}
                      </DetailValue>
                    </DetailItem>
                    {coupon.endDate && (
                      <DetailItem $full>
                        <DetailLabel><FaCalendarAlt /> {t('admin.expires')}</DetailLabel>
                        <DetailValue>
                          {new Date(coupon.endDate).toLocaleDateString()}
                        </DetailValue>
                      </DetailItem>
                    )}
                  </DetailsGrid>
                </CardBody>
                
                <CardActions>
                  <CouponActionButton onClick={() => onEditCoupon(coupon)}>
                    <FaEdit /> {t('common.edit')}
                  </CouponActionButton>
                  <CouponActionButton $danger onClick={() => onDeleteCoupon(coupon.id)}>
                    <FaTrash /> {t('common.delete')}
                  </CouponActionButton>
                </CardActions>
              </CouponCard>
            ))}
          </AnimatePresence>
        </CouponGrid>
      )}
    </AdminContainer>
  );
};

// ============================================
// COUPON-SPECIFIC STYLED COMPONENTS
// ============================================

const AddCouponButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, #ff2d55);
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

const MiniStat = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const MiniStatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const MiniStatLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CouponCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${props => props.$active ? theme.colors.surfaceBorder : 'rgba(255, 59, 48, 0.2)'};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  opacity: ${props => props.$active ? 1 : 0.7};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const CouponCode = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  code {
    font-family: ${theme.fonts.mono};
    font-size: ${theme.fontSizes.md};
    font-weight: ${theme.fontWeights.bold};
    color: ${theme.colors.text};
    letter-spacing: 1px;
  }
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.primary};
    color: white;
  }
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$active ? theme.colors.success : theme.colors.error};
  box-shadow: 0 0 8px ${props => props.$active ? theme.colors.success : theme.colors.error}80;
`;

const CardBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const Description = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const RewardTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$type === 'coins' 
    ? 'linear-gradient(135deg, rgba(255, 214, 10, 0.2), rgba(255, 159, 10, 0.2))'
    : 'linear-gradient(135deg, rgba(0, 113, 227, 0.2), rgba(88, 86, 214, 0.2))'
  };
  border-radius: ${theme.radius.full};
  margin-bottom: ${theme.spacing.md};
  
  svg {
    color: ${props => props.$type === 'coins' ? '#ffd60a' : theme.colors.primary};
  }
  
  span {
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.semibold};
    color: ${theme.colors.text};
  }
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
`;

const DetailItem = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  grid-column: ${props => props.$full ? 'span 2' : 'auto'};
`;

const DetailLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
  
  svg { font-size: 10px; }
`;

const DetailValue = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const CardActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const CouponActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 113, 227, 0.15)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$danger ? theme.colors.error : theme.colors.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.25)' : 'rgba(0, 113, 227, 0.25)'};
  }
`;

export default AdminCoupons;
