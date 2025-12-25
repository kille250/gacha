/**
 * AdminCoupons - Coupon management component for the admin interface
 *
 * Features:
 * - Grid view of all coupons with card layout
 * - Active/expired status indicators
 * - Quick stats (active, expired, total uses)
 * - Copy code to clipboard with feedback
 * - Create, edit, and delete coupons
 *
 * @accessibility
 * - All interactive elements are keyboard accessible
 * - Copy button announces success to screen readers
 * - Status indicators use color + text for accessibility
 * - Focus management on actions
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaPlus, FaEdit, FaTrash, FaCoins, FaUsers, FaCalendarAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { theme, motionVariants, AriaLiveRegion } from '../../design-system';
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

  // Track which code was just copied for visual feedback
  const [copiedCode, setCopiedCode] = useState(null);

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  const copyToClipboard = useCallback((code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setAnnouncement(t('admin.codeCopied', { code }, `Code ${code} copied to clipboard`));

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    });
  }, [t]);

  const activeCoupons = coupons.filter(c => c.isActive);
  const expiredCoupons = coupons.filter(c => !c.isActive);

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={t('admin.couponManagement')}
    >
      {/* Screen reader announcements */}
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.accent}>
          <FaTicketAlt aria-hidden="true" /> {t('admin.couponManagement')}
          <ItemCount aria-label={t('admin.couponCount', { count: coupons.length })}>
            {coupons.length} {t('admin.couponsLabel', 'coupons')}
          </ItemCount>
        </SectionTitle>
        <AddCouponButton
          onClick={onAddCoupon}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={t('admin.createCoupon')}
        >
          <FaPlus aria-hidden="true" /> {t('admin.createCoupon')}
        </AddCouponButton>
      </HeaderRow>

      <StatsRow role="group" aria-label={t('admin.couponStats', 'Coupon statistics')}>
        <MiniStat>
          <MiniStatValue aria-label={t('admin.activeCount')}>{activeCoupons.length}</MiniStatValue>
          <MiniStatLabel>{t('admin.activeCount')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue aria-label={t('admin.expiredCount')}>{expiredCoupons.length}</MiniStatValue>
          <MiniStatLabel>{t('admin.expiredCount')}</MiniStatLabel>
        </MiniStat>
        <MiniStat>
          <MiniStatValue aria-label={t('admin.totalUses')}>{coupons.reduce((sum, c) => sum + c.currentUses, 0)}</MiniStatValue>
          <MiniStatLabel>{t('admin.totalUses')}</MiniStatLabel>
        </MiniStat>
      </StatsRow>
      
      {coupons.length === 0 ? (
        <EmptyState role="status">
          <EmptyIcon aria-hidden="true">🎫</EmptyIcon>
          <EmptyText>{t('admin.noCouponsYet')}</EmptyText>
          <EmptySubtext>{t('admin.createDiscountCodes')}</EmptySubtext>
          <AddCouponButton onClick={onAddCoupon} style={{ marginTop: theme.spacing.lg }}>
            <FaPlus aria-hidden="true" /> {t('admin.createCoupon')}
          </AddCouponButton>
        </EmptyState>
      ) : (
        <CouponGrid role="list" aria-label={t('admin.couponList', 'Coupon list')}>
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
                role="listitem"
                aria-label={`${coupon.code} - ${coupon.isActive ? t('admin.active', 'Active') : t('admin.expired', 'Expired')}`}
              >
                <CardHeader>
                  <CouponCode>
                    <code>{coupon.code}</code>
                    <CopyButton
                      onClick={() => copyToClipboard(coupon.code)}
                      aria-label={t('admin.copyCode', { code: coupon.code }, `Copy code ${coupon.code}`)}
                      $copied={copiedCode === coupon.code}
                    >
                      {copiedCode === coupon.code ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
                    </CopyButton>
                  </CouponCode>
                  <StatusIndicator $active={coupon.isActive}>
                    <StatusDot $active={coupon.isActive} aria-hidden="true" />
                    <StatusText>{coupon.isActive ? t('admin.active', 'Active') : t('admin.expired', 'Expired')}</StatusText>
                  </StatusIndicator>
                </CardHeader>

                <CardBody>
                  {coupon.description && (
                    <Description>{coupon.description}</Description>
                  )}

                  <RewardTag $type={coupon.type}>
                    {coupon.type === 'coins' ? (
                      <>
                        <FaCoins aria-hidden="true" />
                        <span>{coupon.value} {t('common.coins', 'Coins')}</span>
                      </>
                    ) : (
                      <>
                        <FaUsers aria-hidden="true" />
                        <span>{coupon.Character?.name || t('common.character', 'Character')}</span>
                      </>
                    )}
                  </RewardTag>

                  <DetailsGrid>
                    <DetailItem>
                      <DetailLabel id={`uses-label-${coupon.id}`}>{t('admin.uses')}</DetailLabel>
                      <DetailValue aria-labelledby={`uses-label-${coupon.id}`}>
                        {coupon.currentUses} / {coupon.maxUses === -1 ? '∞' : coupon.maxUses}
                      </DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel id={`peruser-label-${coupon.id}`}>{t('admin.perUser')}</DetailLabel>
                      <DetailValue aria-labelledby={`peruser-label-${coupon.id}`}>
                        {coupon.usesPerUser === -1 ? '∞' : coupon.usesPerUser}
                      </DetailValue>
                    </DetailItem>
                    {coupon.endDate && (
                      <DetailItem $full>
                        <DetailLabel>
                          <FaCalendarAlt aria-hidden="true" /> {t('admin.expires')}
                        </DetailLabel>
                        <DetailValue>
                          {new Date(coupon.endDate).toLocaleDateString()}
                        </DetailValue>
                      </DetailItem>
                    )}
                  </DetailsGrid>
                </CardBody>

                <CardActions>
                  <CouponActionButton
                    onClick={() => onEditCoupon(coupon)}
                    aria-label={t('admin.editCouponLabel', { code: coupon.code }, `Edit coupon ${coupon.code}`)}
                  >
                    <FaEdit aria-hidden="true" /> {t('common.edit')}
                  </CouponActionButton>
                  <CouponActionButton
                    $danger
                    onClick={() => onDeleteCoupon(coupon.id, coupon.code)}
                    aria-label={t('admin.deleteCouponLabel', { code: coupon.code }, `Delete coupon ${coupon.code}`)}
                  >
                    <FaTrash aria-hidden="true" /> {t('common.delete')}
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
  width: 32px;
  height: 32px;
  min-width: 32px;
  background: ${props => props.$copied ? theme.colors.success : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$copied ? 'white' : theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${props => props.$copied ? theme.colors.success : theme.colors.primary};
    color: white;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const StatusDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$active ? theme.colors.success : theme.colors.error};
  box-shadow: 0 0 8px ${props => props.$active ? theme.colors.success : theme.colors.error}80;
`;

const StatusText = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};

  /* Visually hidden on mobile, still accessible */
  @media (max-width: ${theme.breakpoints.sm}) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
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
  min-height: 44px;
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

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 48px;
    padding: ${theme.spacing.md};
  }
`;

// PropTypes for type checking and documentation
AdminCoupons.propTypes = {
  /** Array of coupon objects to display */
  coupons: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    code: PropTypes.string.isRequired,
    description: PropTypes.string,
    type: PropTypes.oneOf(['coins', 'character']).isRequired,
    value: PropTypes.number,
    isActive: PropTypes.bool.isRequired,
    currentUses: PropTypes.number.isRequired,
    maxUses: PropTypes.number.isRequired,
    usesPerUser: PropTypes.number.isRequired,
    endDate: PropTypes.string,
    Character: PropTypes.shape({
      name: PropTypes.string,
    }),
  })).isRequired,
  /** Handler for creating a new coupon */
  onAddCoupon: PropTypes.func.isRequired,
  /** Handler for editing a coupon */
  onEditCoupon: PropTypes.func.isRequired,
  /** Handler for deleting a coupon (id, code) */
  onDeleteCoupon: PropTypes.func.isRequired,
};

export default AdminCoupons;
