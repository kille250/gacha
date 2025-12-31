/**
 * AdminRarities - Rarity management interface for administrators
 *
 * Refactored from a 2086-line component into modular subcomponents:
 * - RarityCard: Display individual rarity information
 * - RarityFormModal: Create/edit rarity form
 * - RaritySimulator: Interactive rate testing tool
 * - RarityPresets: Preset configurations and utilities
 * - RarityStyles: All styled components
 *
 * Features:
 * - View and manage all rarities
 * - Interactive rate simulator
 * - Rate validation with warnings
 * - Quick guide for configuration
 * - Confirmation dialogs for destructive actions
 *
 * Accessibility:
 * - Keyboard navigable
 * - Screen reader friendly
 * - Proper focus management
 * - ARIA labels and roles
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence } from 'framer-motion';
import {
  FaStar, FaPlus, FaUndo, FaDice, FaHourglass, FaTimes,
  FaLightbulb, FaChartBar, FaCrosshairs, FaShieldAlt, FaExclamationTriangle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants, ConfirmDialog } from '../../../design-system';
import { useToast } from '../../../context/ToastContext';
import { getRarities, createRarity, updateRarity, deleteRarity, resetDefaultRarities } from '../../../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../../../cache';
import { useRarity } from '../../../context/RarityContext';
import { IconArrowRight } from '../../../constants/icons';
import {
  AdminContainer,
  HeaderRow,
  SectionTitle,
  ItemCount,
  ActionBar,
  ActionGroup,
  ActionButton,
  EmptyState,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
  SecondaryButton,
} from '../Admin.styles';

// Subcomponents
import RarityCard from './RarityCard';
import RarityFormModal from './RarityFormModal';
import RaritySimulator from './RaritySimulator';
import { getEmptyFormData } from './RarityPresets';
import {
  InfoBox,
  InfoHeader,
  InfoContent,
  QuickGuideGrid,
  GuideItem,
  GuideIcon,
  GuideText,
  WarningBox,
  WarningHeader,
  WarningContent,
  WarningText,
  RateTotalsGrid,
  RateTotalItem,
  RateTotalLabel,
  RateTotalValue,
  RarityGrid,
} from './Rarity.styles';

const AdminRarities = ({ onRefresh }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { refetch: refetchRarityContext } = useRarity();

  // Data state
  const [rarities, setRarities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRarity, setEditingRarity] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorPulls, setSimulatorPulls] = useState(100);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: null,
    loading: false,
  });

  // Fetch rarities from API
  const fetchRarities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRarities();
      setRarities(data);
      setError(null);
    } catch (err) {
      setError('Failed to load rarities');
      console.error('Error fetching rarities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRarities();
  }, [fetchRarities]);

  // Calculate rate totals for validation
  const rateTotals = useMemo(() => {
    if (rarities.length === 0) return null;

    const pools = [
      { key: 'standardSingle', label: 'Standard Single', field: 'dropRateStandardSingle' },
      { key: 'standardMulti', label: 'Standard Multi', field: 'dropRateStandardMulti' },
      { key: 'bannerSingle', label: 'Banner Single', field: 'dropRateBannerSingle' },
      { key: 'bannerMulti', label: 'Banner Multi', field: 'dropRateBannerMulti' },
      { key: 'premiumSingle', label: 'Premium Single', field: 'dropRatePremiumSingle' },
      { key: 'premiumMulti', label: 'Premium Multi', field: 'dropRatePremiumMulti' },
      { key: 'pity', label: 'Pity', field: 'dropRatePity' },
    ];

    return pools.map(pool => {
      const total = rarities.reduce((sum, r) => sum + (r[pool.field] || 0), 0);
      const effectiveRates = {};

      rarities.forEach(r => {
        effectiveRates[r.name] = total > 0
          ? ((r[pool.field] || 0) / total * 100).toFixed(1)
          : 0;
      });

      return {
        ...pool,
        total,
        isValid: Math.abs(total - 100) < 0.1,
        effectiveRates,
      };
    });
  }, [rarities]);

  // Simulated results for the simulator
  const simulatedResults = useMemo(() => {
    if (!rateTotals || rarities.length === 0) return null;

    const results = {};
    const pools = ['standardSingle', 'standardMulti', 'bannerSingle', 'premiumSingle'];

    pools.forEach(poolKey => {
      const pool = rateTotals.find(p => p.key === poolKey);
      if (!pool) return;

      results[poolKey] = {};
      rarities.forEach(r => {
        const effectiveRate = parseFloat(pool.effectiveRates[r.name]) || 0;
        const expectedCount = (effectiveRate / 100) * simulatorPulls;
        results[poolKey][r.name] = {
          count: Math.round(expectedCount * 10) / 10,
          rate: effectiveRate
        };
      });
    });

    return results;
  }, [rateTotals, rarities, simulatorPulls]);

  // Check if any pool has invalid totals
  const hasInvalidTotals = rateTotals?.some(p => !p.isValid);

  // Handle edit click
  const handleEditClick = useCallback((rarity) => {
    setEditingRarity(rarity);
    setFormData({
      name: rarity.name,
      displayName: rarity.displayName,
      order: rarity.order,
      dropRateStandardSingle: rarity.dropRateStandardSingle,
      dropRateStandardMulti: rarity.dropRateStandardMulti,
      dropRateBannerSingle: rarity.dropRateBannerSingle,
      dropRateBannerMulti: rarity.dropRateBannerMulti,
      dropRatePremiumSingle: rarity.dropRatePremiumSingle,
      dropRatePremiumMulti: rarity.dropRatePremiumMulti,
      dropRatePity: rarity.dropRatePity,
      capSingle: rarity.capSingle || '',
      capMulti: rarity.capMulti || '',
      multiplierScaling: rarity.multiplierScaling,
      minimumRate: rarity.minimumRate || 0,
      color: rarity.color,
      accentColor: rarity.accentColor || '',
      glowIntensity: rarity.glowIntensity,
      buildupTime: rarity.buildupTime,
      orbCount: rarity.orbCount,
      ringCount: rarity.ringCount,
      isPityEligible: rarity.isPityEligible,
    });
    setShowModal(true);
  }, []);

  // Handle add click
  const handleAddClick = useCallback(() => {
    setEditingRarity(null);
    setFormData(getEmptyFormData());
    setShowModal(true);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('admin.rarities.errorNameRequired', 'Internal name is required'));
      return;
    }
    if (!formData.displayName.trim()) {
      toast.error(t('admin.rarities.errorDisplayNameRequired', 'Display name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        name: formData.name.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        capSingle: formData.capSingle === '' ? null : parseFloat(formData.capSingle),
        capMulti: formData.capMulti === '' ? null : parseFloat(formData.capMulti),
        accentColor: formData.accentColor || null,
      };

      if (editingRarity) {
        await updateRarity(editingRarity.id, submitData);
        invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_EDIT);
        toast.success(t('admin.rarities.updated', 'Rarity updated successfully'));
      } else {
        await createRarity(submitData);
        invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_ADD);
        toast.success(t('admin.rarities.created', 'Rarity created successfully'));
      }

      await fetchRarities();
      await refetchRarityContext();
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving rarity:', err);
      toast.error(err.response?.data?.error || t('admin.rarities.errorSaving', 'Failed to save rarity'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingRarity, t, toast, fetchRarities, refetchRarityContext, onRefresh]);

  // Handle delete click
  const handleDeleteClick = useCallback((rarity) => {
    if (rarity.isDefault) {
      toast.error(t('admin.rarities.cannotDeleteDefault', 'Cannot delete default rarities'));
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: t('admin.rarities.confirmDeleteTitle', 'Delete Rarity'),
      message: t('admin.rarities.confirmDeleteMessage', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.').replace('{{name}}', rarity.displayName),
      variant: 'danger',
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteRarity(rarity.id);
          invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_DELETE);
          await fetchRarities();
          await refetchRarityContext();
          toast.success(t('admin.rarities.deleted', 'Rarity deleted successfully'));
          if (onRefresh) onRefresh();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          console.error('Error deleting rarity:', err);
          toast.error(err.response?.data?.error || t('admin.rarities.errorDeleting', 'Failed to delete rarity'));
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      },
      loading: false,
    });
  }, [t, toast, fetchRarities, refetchRarityContext, onRefresh]);

  // Handle reset defaults
  const handleResetClick = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: t('admin.rarities.confirmResetTitle', 'Reset to Defaults'),
      message: t('admin.rarities.confirmResetMessage', 'This will restore all rarities to their default settings. Any custom rarities you have created will be removed. This action cannot be undone.'),
      variant: 'warning',
      confirmLabel: t('admin.rarities.resetConfirm', 'Reset Defaults'),
      cancelLabel: t('common.cancel', 'Cancel'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await resetDefaultRarities();
          invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_RESET);
          await fetchRarities();
          await refetchRarityContext();
          toast.success(t('admin.rarities.resetSuccess', 'Rarities reset to defaults'));
          if (onRefresh) onRefresh();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          console.error('Error resetting rarities:', err);
          toast.error(err.response?.data?.error || t('admin.rarities.errorResetting', 'Failed to reset rarities'));
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      },
      loading: false,
    });
  }, [t, toast, fetchRarities, refetchRarityContext, onRefresh]);

  // Close confirmation dialog
  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
  }, []);

  // Loading state
  if (loading) {
    return (
      <AdminContainer>
        <EmptyState role="status" aria-live="polite">
          <EmptyIcon><FaHourglass aria-hidden="true" /></EmptyIcon>
          <EmptyText>{t('admin.rarities.loading')}</EmptyText>
        </EmptyState>
      </AdminContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminContainer>
        <EmptyState role="alert">
          <EmptyIcon><FaTimes aria-hidden="true" /></EmptyIcon>
          <EmptyText>{error}</EmptyText>
          <SecondaryButton onClick={fetchRarities} style={{ marginTop: '16px' }}>
            {t('admin.retry')}
          </SecondaryButton>
        </EmptyState>
      </AdminContainer>
    );
  }

  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.warning}>
          <FaStar aria-hidden="true" />
          {t('admin.rarities.title')}
          <ItemCount>
            {rarities.length} {t('admin.tabs.rarities').toLowerCase()}
          </ItemCount>
        </SectionTitle>
      </HeaderRow>

      {/* Action Bar */}
      <ActionBar>
        <ActionGroup>
          <ActionButton onClick={handleAddClick}>
            <FaPlus aria-hidden="true" />
            {t('admin.rarities.addRarity')}
          </ActionButton>
          <ActionButton
            $variant="secondary"
            onClick={() => setShowSimulator(!showSimulator)}
            aria-expanded={showSimulator}
            aria-controls="rarity-simulator"
          >
            <FaDice aria-hidden="true" />
            {showSimulator
              ? t('admin.rarities.hideSimulator')
              : t('admin.rarities.showSimulator')
            }
          </ActionButton>
          <ActionButton $variant="warning" onClick={handleResetClick}>
            <FaUndo aria-hidden="true" />
            {t('admin.rarities.resetDefaults')}
          </ActionButton>
        </ActionGroup>
      </ActionBar>

      {/* Quick Guide */}
      <InfoBox>
        <InfoHeader>
          <FaLightbulb aria-hidden="true" />
          {t('admin.rarities.quickGuide')}
        </InfoHeader>
        <InfoContent>
          <QuickGuideGrid>
            <GuideItem>
              <GuideIcon><FaChartBar aria-hidden="true" /></GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideRelativeWeights')}</strong>
                {t('admin.rarities.guideRelativeWeightsDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon><FaCrosshairs aria-hidden="true" /></GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideSingleVsMulti')}</strong>
                {t('admin.rarities.guideSingleVsMultiDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon><FaStar aria-hidden="true" /></GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guide100Percent')}</strong>
                {t('admin.rarities.guide100PercentDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon><FaShieldAlt aria-hidden="true" /></GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideMinimumRate')}</strong>
                {t('admin.rarities.guideMinimumRateDesc')}
              </GuideText>
            </GuideItem>
          </QuickGuideGrid>
        </InfoContent>
      </InfoBox>

      {/* Rate Simulator */}
      <RaritySimulator
        isVisible={showSimulator}
        pullCount={simulatorPulls}
        onPullCountChange={setSimulatorPulls}
        simulatedResults={simulatedResults}
        rarities={rarities}
      />

      {/* Rate Totals Warning */}
      {hasInvalidTotals && rateTotals && (
        <WarningBox role="alert">
          <WarningHeader>
            <FaExclamationTriangle aria-hidden="true" />
            {t('admin.rarities.warningTitle')}
          </WarningHeader>
          <WarningContent>
            <WarningText>
              {t('admin.rarities.warningText')}
            </WarningText>
            <RateTotalsGrid>
              {rateTotals.map(pool => (
                <RateTotalItem key={pool.key} $isValid={pool.isValid}>
                  <RateTotalLabel>{pool.label}</RateTotalLabel>
                  <RateTotalValue $isValid={pool.isValid}>
                    {pool.total.toFixed(1)}%
                    {!pool.isValid && <span> <IconArrowRight /> normalized</span>}
                  </RateTotalValue>
                </RateTotalItem>
              ))}
            </RateTotalsGrid>
          </WarningContent>
        </WarningBox>
      )}

      {/* Rarity Cards */}
      {rarities.length === 0 ? (
        <EmptyState>
          <EmptyIcon><FaStar aria-hidden="true" /></EmptyIcon>
          <EmptyText>{t('admin.rarities.noRarities')}</EmptyText>
          <EmptySubtext>{t('admin.rarities.noRaritiesDesc')}</EmptySubtext>
        </EmptyState>
      ) : (
        <RarityGrid role="list" aria-label={t('admin.rarities.title')}>
          <AnimatePresence mode="popLayout">
            {rarities.map(rarity => (
              <RarityCard
                key={rarity.id}
                rarity={rarity}
                rateTotals={rateTotals}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </AnimatePresence>
        </RarityGrid>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {showModal && (
          <RarityFormModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            editingRarity={editingRarity}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        loading={confirmDialog.loading}
      />
    </AdminContainer>
  );
};

AdminRarities.propTypes = {
  onRefresh: PropTypes.func,
};

export default AdminRarities;
