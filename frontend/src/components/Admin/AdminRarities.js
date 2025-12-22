import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaStar, FaEdit, FaTrash, FaPlus, FaUndo, FaPercent, FaPalette, FaMagic, 
  FaExclamationTriangle, FaInfoCircle, FaChevronDown, FaChevronUp, FaCopy,
  FaDice, FaLightbulb, FaQuestionCircle, FaCog
} from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import { getRarities, createRarity, updateRarity, deleteRarity, resetDefaultRarities } from '../../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../../cache';
import { useRarity } from '../../context/RarityContext';
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
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  FormRow,
  Label,
  Input,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  CheckboxLabel,
} from './AdminStyles';

// ============================================
// PRESETS - Common rarity configurations
// ============================================

const RARITY_PRESETS = {
  common: {
    labelKey: 'presetCommon',
    descKey: 'presetCommonDesc',
    values: {
      dropRateStandardSingle: 70,
      dropRateStandardMulti: 65,
      dropRateBannerSingle: 60,
      dropRateBannerMulti: 55,
      dropRatePremiumSingle: 0,
      dropRatePremiumMulti: 0,
      dropRatePity: 0,
      multiplierScaling: 0,
      minimumRate: 35,
      isPityEligible: false,
      glowIntensity: 0.3,
      buildupTime: 800,
      confettiCount: 0,
      orbCount: 3,
      ringCount: 1,
    }
  },
  uncommon: {
    labelKey: 'presetUncommon',
    descKey: 'presetUncommonDesc',
    values: {
      dropRateStandardSingle: 20,
      dropRateStandardMulti: 22,
      dropRateBannerSingle: 22,
      dropRateBannerMulti: 24,
      dropRatePremiumSingle: 0,
      dropRatePremiumMulti: 0,
      dropRatePity: 0,
      multiplierScaling: 0.5,
      minimumRate: 0,
      isPityEligible: false,
      glowIntensity: 0.5,
      buildupTime: 1000,
      confettiCount: 30,
      orbCount: 4,
      ringCount: 1,
    }
  },
  rare: {
    labelKey: 'presetRare',
    descKey: 'presetRareDesc',
    values: {
      dropRateStandardSingle: 7,
      dropRateStandardMulti: 9,
      dropRateBannerSingle: 12,
      dropRateBannerMulti: 14,
      dropRatePremiumSingle: 70,
      dropRatePremiumMulti: 65,
      dropRatePity: 85,
      multiplierScaling: 1.0,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 0.7,
      buildupTime: 1400,
      confettiCount: 80,
      orbCount: 5,
      ringCount: 2,
    }
  },
  epic: {
    labelKey: 'presetEpic',
    descKey: 'presetEpicDesc',
    values: {
      dropRateStandardSingle: 2.5,
      dropRateStandardMulti: 3.5,
      dropRateBannerSingle: 5,
      dropRateBannerMulti: 6,
      dropRatePremiumSingle: 25,
      dropRatePremiumMulti: 28,
      dropRatePity: 14,
      multiplierScaling: 1.5,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 0.85,
      buildupTime: 1800,
      confettiCount: 120,
      orbCount: 6,
      ringCount: 2,
    }
  },
  legendary: {
    labelKey: 'presetLegendary',
    descKey: 'presetLegendaryDesc',
    values: {
      dropRateStandardSingle: 0.5,
      dropRateStandardMulti: 0.5,
      dropRateBannerSingle: 1,
      dropRateBannerMulti: 1,
      dropRatePremiumSingle: 5,
      dropRatePremiumMulti: 7,
      dropRatePity: 1,
      multiplierScaling: 2.0,
      minimumRate: 0,
      isPityEligible: true,
      glowIntensity: 1.0,
      buildupTime: 2200,
      confettiCount: 200,
      orbCount: 8,
      ringCount: 3,
    }
  }
};

// ============================================
// TOOLTIPS - Field explanations (keys for translation)
// ============================================

const FIELD_TOOLTIP_KEYS = {
  dropRateStandardSingle: 'tooltipStandardSingle',
  dropRateStandardMulti: 'tooltipStandardMulti',
  dropRateBannerSingle: 'tooltipBannerSingle',
  dropRateBannerMulti: 'tooltipBannerMulti',
  dropRatePremiumSingle: 'tooltipPremiumSingle',
  dropRatePremiumMulti: 'tooltipPremiumMulti',
  dropRatePity: 'tooltipPity',
  capSingle: 'tooltipCapSingle',
  capMulti: 'tooltipCapMulti',
  multiplierScaling: 'tooltipMultiplierScaling',
  minimumRate: 'tooltipMinimumRate',
  isPityEligible: 'tooltipPityEligible',
  order: 'tooltipOrder',
};

const AdminRarities = ({ onRefresh }) => {
  const { t } = useTranslation();
  const { refetch: refetchRarityContext } = useRarity();
  const [rarities, setRarities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRarity, setEditingRarity] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    rates: true,
    advanced: false,
    visual: false,
    animation: false
  });
  
  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorPulls, setSimulatorPulls] = useState(100);

  function getEmptyFormData() {
    return {
      name: '',
      displayName: '',
      order: 0,
      dropRateStandardSingle: 0,
      dropRateStandardMulti: 0,
      dropRateBannerSingle: 0,
      dropRateBannerMulti: 0,
      dropRatePremiumSingle: 0,
      dropRatePremiumMulti: 0,
      dropRatePity: 0,
      capSingle: '',
      capMulti: '',
      multiplierScaling: 1,
      minimumRate: 0,
      color: '#8e8e93',
      accentColor: '',
      glowIntensity: 0.5,
      buildupTime: 1000,
      confettiCount: 0,
      orbCount: 3,
      ringCount: 1,
      isPityEligible: false,
    };
  }

  const fetchRarities = async () => {
    try {
      setLoading(true);
      const data = await getRarities();
      setRarities(data);
      setError(null);
    } catch (err) {
      setError('Failed to load rarities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRarities();
  }, []);

  // Calculate rate totals for each pool type
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
      
      // Calculate effective rates after normalization
      const effectiveRates = {};
      rarities.forEach(r => {
        effectiveRates[r.name] = total > 0 ? ((r[pool.field] || 0) / total * 100).toFixed(1) : 0;
      });
      
      return {
        ...pool,
        total,
        isValid: Math.abs(total - 100) < 0.1,
        effectiveRates,
      };
    });
  }, [rarities]);

  // Simulate expected results
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
        // For display: show expected count for multi-pulls, or just the rate for single pulls
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Apply a preset to the form
  const applyPreset = useCallback((presetKey) => {
    const preset = RARITY_PRESETS[presetKey];
    if (!preset) return;
    
    setFormData(prev => ({
      ...prev,
      ...preset.values
    }));
  }, []);

  // Copy single rates to multi (with optional adjustment)
  const copySingleToMulti = useCallback((adjustment = 0) => {
    setFormData(prev => ({
      ...prev,
      dropRateStandardMulti: Math.max(0, prev.dropRateStandardSingle + adjustment),
      dropRateBannerMulti: Math.max(0, prev.dropRateBannerSingle + adjustment),
      dropRatePremiumMulti: Math.max(0, prev.dropRatePremiumSingle + adjustment),
      capMulti: prev.capSingle,
    }));
  }, []);

  const handleEditClick = (rarity) => {
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
      confettiCount: rarity.confettiCount,
      orbCount: rarity.orbCount,
      ringCount: rarity.ringCount,
      isPityEligible: rarity.isPityEligible,
    });
    // Expand basic sections, collapse advanced when editing
    setExpandedSections({
      basic: true,
      rates: true,
      advanced: false,
      visual: false,
      animation: false
    });
    setShowModal(true);
  };

  const handleAddClick = () => {
    setEditingRarity(null);
    setFormData(getEmptyFormData());
    setExpandedSections({
      basic: true,
      rates: true,
      advanced: false,
      visual: false,
      animation: false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        capSingle: formData.capSingle === '' ? null : parseFloat(formData.capSingle),
        capMulti: formData.capMulti === '' ? null : parseFloat(formData.capMulti),
        accentColor: formData.accentColor || null,
      };

      if (editingRarity) {
        await updateRarity(editingRarity.id, submitData);
        invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_EDIT);
      } else {
        await createRarity(submitData);
        invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_ADD);
      }
      
      await fetchRarities();
      await refetchRarityContext(); // Refresh the global rarity context with new colors
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving rarity:', err);
      alert(err.response?.data?.error || 'Failed to save rarity');
    }
  };

  const handleDelete = async (rarity) => {
    if (rarity.isDefault) {
      alert(t('admin.rarities.cannotDeleteDefault'));
      return;
    }
    
    if (!window.confirm(`${t('admin.rarities.confirmDelete')} "${rarity.displayName}"?`)) {
      return;
    }
    
    try {
      await deleteRarity(rarity.id);
      invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_DELETE);
      await fetchRarities();
      await refetchRarityContext(); // Refresh the global rarity context
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting rarity:', err);
      alert(err.response?.data?.error || 'Failed to delete rarity');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm(t('admin.rarities.confirmReset'))) {
      return;
    }
    
    try {
      await resetDefaultRarities();
      invalidateFor(CACHE_ACTIONS.ADMIN_RARITY_RESET);
      await fetchRarities();
      await refetchRarityContext(); // Refresh the global rarity context
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error resetting rarities:', err);
      alert(err.response?.data?.error || 'Failed to reset rarities');
    }
  };

  if (loading) {
    return (
      <AdminContainer>
        <EmptyState>
          <EmptyIcon>⏳</EmptyIcon>
          <EmptyText>{t('admin.rarities.loading')}</EmptyText>
        </EmptyState>
      </AdminContainer>
    );
  }

  if (error) {
    return (
      <AdminContainer>
        <EmptyState>
          <EmptyIcon>❌</EmptyIcon>
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
      <HeaderRow>
        <SectionTitle $iconColor={theme.colors.warning}>
          <FaStar /> {t('admin.rarities.title')}
          <ItemCount>{rarities.length} {t('admin.tabs.rarities').toLowerCase()}</ItemCount>
        </SectionTitle>
      </HeaderRow>
      
      <ActionBar>
        <ActionGroup>
          <ActionButton onClick={handleAddClick}>
            <FaPlus /> {t('admin.rarities.addRarity')}
          </ActionButton>
          <ActionButton $variant="secondary" onClick={() => setShowSimulator(!showSimulator)}>
            <FaDice /> {showSimulator ? t('admin.rarities.hideSimulator') : t('admin.rarities.showSimulator')}
          </ActionButton>
          <ActionButton $variant="warning" onClick={handleResetDefaults}>
            <FaUndo /> {t('admin.rarities.resetDefaults')}
          </ActionButton>
        </ActionGroup>
      </ActionBar>

      {/* Quick Guide Box */}
      <InfoBox>
        <InfoHeader>
          <FaLightbulb /> {t('admin.rarities.quickGuide')}
        </InfoHeader>
        <InfoContent>
          <QuickGuideGrid>
            <GuideItem>
              <GuideIcon>📊</GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideRelativeWeights')}</strong><br/>
                {t('admin.rarities.guideRelativeWeightsDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon>🎯</GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideSingleVsMulti')}</strong><br/>
                {t('admin.rarities.guideSingleVsMultiDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon>⭐</GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guide100Percent')}</strong><br/>
                {t('admin.rarities.guide100PercentDesc')}
              </GuideText>
            </GuideItem>
            <GuideItem>
              <GuideIcon>🛡️</GuideIcon>
              <GuideText>
                <strong>{t('admin.rarities.guideMinimumRate')}</strong><br/>
                {t('admin.rarities.guideMinimumRateDesc')}
              </GuideText>
            </GuideItem>
          </QuickGuideGrid>
        </InfoContent>
      </InfoBox>

      {/* Rate Simulator */}
      <AnimatePresence>
        {showSimulator && (
          <SimulatorBox
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SimulatorHeader>
              <FaDice /> {t('admin.rarities.rateSimulator')}
              <SimulatorControls>
                <span>{t('admin.rarities.simulating')}</span>
                <SimulatorInput
                  type="number"
                  value={simulatorPulls}
                  onChange={(e) => setSimulatorPulls(Math.max(1, parseInt(e.target.value) || 100))}
                  min="1"
                  max="10000"
                />
                <span>{t('admin.rarities.pulls')}</span>
              </SimulatorControls>
            </SimulatorHeader>
            <SimulatorContent>
              <SimulatorNote>
                {simulatorPulls === 1 
                  ? t('admin.rarities.simulatorSingleNote')
                  : t('admin.rarities.simulatorMultiNote', { count: simulatorPulls })
                }
              </SimulatorNote>
              {simulatedResults && (
                <SimulatorGrid>
                  {['standardSingle', 'standardMulti', 'bannerSingle', 'premiumSingle'].map(poolKey => (
                    <SimulatorPool key={poolKey}>
                      <SimulatorPoolTitle>
                        {poolKey === 'standardSingle' && t('admin.rarities.poolStandardSingle')}
                        {poolKey === 'standardMulti' && t('admin.rarities.poolStandardMulti')}
                        {poolKey === 'bannerSingle' && t('admin.rarities.poolBanner')}
                        {poolKey === 'premiumSingle' && t('admin.rarities.poolPremium')}
                      </SimulatorPoolTitle>
                      {rarities.map(r => {
                        const result = simulatedResults[poolKey]?.[r.name];
                        const rate = result?.rate || 0;
                        const count = result?.count || 0;
                        
                        return (
                          <SimulatorRow key={r.name} $color={r.color}>
                            <SimulatorRarity $color={r.color}>{r.displayName}</SimulatorRarity>
                            <SimulatorValue>
                              {simulatorPulls === 1 ? (
                                // For single pull, just show the percentage prominently
                                <SimulatorMainRate>{rate.toFixed(1)}%</SimulatorMainRate>
                              ) : (
                                // For multi-pulls, show expected count with percentage
                                <>
                                  ~{count}
                                  <SimulatorPercent>({rate.toFixed(1)}%)</SimulatorPercent>
                                </>
                              )}
                            </SimulatorValue>
                          </SimulatorRow>
                        );
                      })}
                    </SimulatorPool>
                  ))}
                </SimulatorGrid>
              )}
            </SimulatorContent>
          </SimulatorBox>
        )}
      </AnimatePresence>

      {/* Rate Totals Warning */}
      {hasInvalidTotals && rateTotals && (
        <WarningBox>
          <WarningHeader>
            <FaExclamationTriangle /> {t('admin.rarities.warningTitle')}
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
                    {!pool.isValid && <span> → normalized</span>}
                  </RateTotalValue>
                </RateTotalItem>
              ))}
            </RateTotalsGrid>
          </WarningContent>
        </WarningBox>
      )}

      {rarities.length === 0 ? (
        <EmptyState>
          <EmptyIcon>⭐</EmptyIcon>
          <EmptyText>{t('admin.rarities.noRarities')}</EmptyText>
          <EmptySubtext>{t('admin.rarities.noRaritiesDesc')}</EmptySubtext>
        </EmptyState>
      ) : (
        <RarityGrid>
          <AnimatePresence mode="popLayout">
            {rarities.map(rarity => (
              <RarityCard
                key={rarity.id}
                variants={motionVariants.card}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                $color={rarity.color}
              >
                <RarityHeader $color={rarity.color}>
                  <RarityName>{rarity.displayName}</RarityName>
                  <RarityBadge $color={rarity.color}>{rarity.name}</RarityBadge>
                </RarityHeader>
                
                <RarityBody>
                  <RaritySection>
                    <SectionLabel><FaPercent /> {t('admin.rarities.dropRates')}</SectionLabel>
                    <RateGrid>
                      <RateItem>
                        <RateLabel>{t('admin.rarities.standard')}</RateLabel>
                        <RateValue>{rarity.dropRateStandardSingle}% / {rarity.dropRateStandardMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'standardSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'standardMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>{t('admin.rarities.banner')}</RateLabel>
                        <RateValue>{rarity.dropRateBannerSingle}% / {rarity.dropRateBannerMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'bannerSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'bannerMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>{t('admin.rarities.premium')}</RateLabel>
                        <RateValue>{rarity.dropRatePremiumSingle}% / {rarity.dropRatePremiumMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'premiumSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'premiumMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>{t('admin.rarities.pity')}</RateLabel>
                        <RateValue>{rarity.dropRatePity}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'pity')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                    </RateGrid>
                  </RaritySection>
                  
                  <RaritySection>
                    <SectionLabel><FaPalette /> {t('admin.rarities.visual')}</SectionLabel>
                    <VisualRow>
                      <ColorSwatch $color={rarity.color} title="Primary Color" />
                      {rarity.accentColor && (
                        <ColorSwatch $color={rarity.accentColor} title="Accent Color" />
                      )}
                      <VisualInfo>
                        <span>{t('admin.rarities.glow')}: {Math.round(rarity.glowIntensity * 100)}%</span>
                        <span>{t('admin.rarities.orbs')}: {rarity.orbCount}</span>
                      </VisualInfo>
                    </VisualRow>
                  </RaritySection>
                  
                  <RarityMeta>
                    <MetaItem>{t('admin.rarities.order')}: {rarity.order}</MetaItem>
                    {rarity.minimumRate > 0 && (
                      <MetaItem $warning>{t('admin.rarities.min')}: {rarity.minimumRate}%</MetaItem>
                    )}
                    {rarity.isPityEligible && <MetaItem $highlight>{t('admin.rarities.pityEligible')}</MetaItem>}
                    {rarity.isDefault && <MetaItem $muted>{t('admin.rarities.default')}</MetaItem>}
                  </RarityMeta>
                </RarityBody>
                
                <RarityActions>
                  <IconButton onClick={() => handleEditClick(rarity)} title="Edit">
                    <FaEdit />
                  </IconButton>
                  {!rarity.isDefault && (
                    <IconButton $danger onClick={() => handleDelete(rarity)} title="Delete">
                      <FaTrash />
                    </IconButton>
                  )}
                </RarityActions>
              </RarityCard>
            ))}
          </AnimatePresence>
        </RarityGrid>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              $maxWidth="750px"
            >
              <ModalHeader>
                <ModalTitle $iconColor={theme.colors.warning}>
                  <FaStar /> {editingRarity ? t('admin.rarities.editRarity') : t('admin.rarities.addRarity')}
                </ModalTitle>
                <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
              </ModalHeader>
              
              <ModalBody>
                {/* Preset Buttons - only show when adding new */}
                {!editingRarity && (
                  <PresetSection>
                    <PresetLabel>
                      <FaLightbulb /> {t('admin.rarities.presetQuickStart')}
                    </PresetLabel>
                    <PresetGrid>
                      {Object.entries(RARITY_PRESETS).map(([key, preset]) => (
                        <PresetButton
                          key={key}
                          type="button"
                          onClick={() => applyPreset(key)}
                          title={t(`admin.rarities.${preset.descKey}`)}
                        >
                          {t(`admin.rarities.${preset.labelKey}`)}
                        </PresetButton>
                      ))}
                    </PresetGrid>
                  </PresetSection>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Basic Info - Always visible */}
                  <CollapsibleSection $expanded={expandedSections.basic}>
                    <SectionHeader onClick={() => toggleSection('basic')}>
                      <SectionHeaderTitle>
                        <FaInfoCircle /> {t('admin.rarities.basicInfo')}
                      </SectionHeaderTitle>
                      {expandedSections.basic ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {expandedSections.basic && (
                        <SectionContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.internalName')}</Label>
                                <Tooltip title="Unique identifier used in code (lowercase, no spaces)">
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., mythic"
                                disabled={editingRarity?.isDefault}
                                required
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.displayName')}</Label>
                              <Input
                                type="text"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                placeholder="e.g., Mythic"
                                required
                              />
                            </FormGroup>
                            <FormGroup style={{ width: '100px' }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.order')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.order}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="order"
                                value={formData.order}
                                onChange={handleNumberChange}
                                min="0"
                              />
                            </FormGroup>
                          </FormRow>
                        </SectionContent>
                      )}
                    </AnimatePresence>
                  </CollapsibleSection>

                  {/* Drop Rates - Main section */}
                  <CollapsibleSection $expanded={expandedSections.rates}>
                    <SectionHeader onClick={() => toggleSection('rates')}>
                      <SectionHeaderTitle>
                        <FaPercent /> {t('admin.rarities.dropRatesPercent')}
                        <SectionBadge>{t('admin.rarities.coreSettings')}</SectionBadge>
                      </SectionHeaderTitle>
                      {expandedSections.rates ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {expandedSections.rates && (
                        <SectionContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          {/* Copy buttons */}
                          <CopyButtonRow>
                            <CopyButton type="button" onClick={() => copySingleToMulti(0)}>
                              <FaCopy /> {t('admin.rarities.copySingleToMultiSame')}
                            </CopyButton>
                            <CopyButton type="button" onClick={() => copySingleToMulti(2)}>
                              <FaCopy /> {t('admin.rarities.copySingleToMultiPlus2')}
                            </CopyButton>
                          </CopyButtonRow>

                          <RateGroupLabel>{t('admin.rarities.standardPool')}</RateGroupLabel>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.singlePullPercent')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRateStandardSingle}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="dropRateStandardSingle"
                                value={formData.dropRateStandardSingle}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.multiPullPercent')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRateStandardMulti}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="dropRateStandardMulti"
                                value={formData.dropRateStandardMulti}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                            </FormGroup>
                          </FormRow>

                          <RateGroupLabel>{t('admin.rarities.bannerPool')}</RateGroupLabel>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.singlePullPercent')}</Label>
                              <Input
                                type="number"
                                name="dropRateBannerSingle"
                                value={formData.dropRateBannerSingle}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.multiPullPercent')}</Label>
                              <Input
                                type="number"
                                name="dropRateBannerMulti"
                                value={formData.dropRateBannerMulti}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                            </FormGroup>
                          </FormRow>

                          <RateGroupLabel>{t('admin.rarities.premiumPool')}</RateGroupLabel>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.singlePullPercent')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRatePremiumSingle}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="dropRatePremiumSingle"
                                value={formData.dropRatePremiumSingle}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                              <FieldHint>{t('admin.rarities.excludeFromPremium')}</FieldHint>
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.multiPullPercent')}</Label>
                              <Input
                                type="number"
                                name="dropRatePremiumMulti"
                                value={formData.dropRatePremiumMulti}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                            </FormGroup>
                          </FormRow>

                          <RateGroupLabel>{t('admin.rarities.pitySystem')}</RateGroupLabel>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.pityRatePercent')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRatePity}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="dropRatePity"
                                value={formData.dropRatePity}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                              <FieldHint>{t('admin.rarities.pityOnlyIfEligible')}</FieldHint>
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>&nbsp;</Label>
                              <CheckboxLabel $padded>
                                <input
                                  type="checkbox"
                                  name="isPityEligible"
                                  checked={formData.isPityEligible}
                                  onChange={handleInputChange}
                                />
                                <span>{t('admin.rarities.pityEligibleRarePlus')}</span>
                              </CheckboxLabel>
                              <FieldHint>{t('admin.rarities.resetsPityCounter')}</FieldHint>
                            </FormGroup>
                          </FormRow>
                        </SectionContent>
                      )}
                    </AnimatePresence>
                  </CollapsibleSection>

                  {/* Advanced Settings - Collapsed by default */}
                  <CollapsibleSection $expanded={expandedSections.advanced}>
                    <SectionHeader onClick={() => toggleSection('advanced')}>
                      <SectionHeaderTitle>
                        <FaCog /> {t('admin.rarities.advancedBannerSettings')}
                        <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                      </SectionHeaderTitle>
                      {expandedSections.advanced ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {expandedSections.advanced && (
                        <SectionContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <AdvancedNote>
                            <FaInfoCircle /> {t('admin.rarities.advancedNote')}
                          </AdvancedNote>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.capSingleLabel')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.capSingle}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="capSingle"
                                value={formData.capSingle}
                                onChange={handleNumberChange}
                                step="0.1"
                                placeholder={t('admin.rarities.noCap')}
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.capMultiLabel')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.capMulti}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="capMulti"
                                value={formData.capMulti}
                                onChange={handleNumberChange}
                                step="0.1"
                                placeholder={t('admin.rarities.noCap')}
                              />
                            </FormGroup>
                          </FormRow>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.multiplierScaling')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.multiplierScaling}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="multiplierScaling"
                                value={formData.multiplierScaling}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                              />
                              <FieldHint>{t('admin.rarities.multiplierScalingHint')}</FieldHint>
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <LabelWithTooltip>
                                <Label>{t('admin.rarities.minimumRate')}</Label>
                                <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.minimumRate}`)}>
                                  <FaQuestionCircle />
                                </Tooltip>
                              </LabelWithTooltip>
                              <Input
                                type="number"
                                name="minimumRate"
                                value={formData.minimumRate}
                                onChange={handleNumberChange}
                                step="1"
                                min="0"
                                max="100"
                              />
                              <FieldHint>{t('admin.rarities.minimumRateFloor')}</FieldHint>
                            </FormGroup>
                          </FormRow>
                        </SectionContent>
                      )}
                    </AnimatePresence>
                  </CollapsibleSection>

                  {/* Visual Settings - Collapsed by default */}
                  <CollapsibleSection $expanded={expandedSections.visual}>
                    <SectionHeader onClick={() => toggleSection('visual')}>
                      <SectionHeaderTitle>
                        <FaPalette /> {t('admin.rarities.visualSettings')}
                        <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                      </SectionHeaderTitle>
                      {expandedSections.visual ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {expandedSections.visual && (
                        <SectionContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.primaryColor')}</Label>
                              <ColorInputWrapper>
                                <ColorInput
                                  type="color"
                                  name="color"
                                  value={formData.color}
                                  onChange={handleInputChange}
                                />
                                <Input
                                  type="text"
                                  value={formData.color}
                                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                  style={{ flex: 1 }}
                                />
                              </ColorInputWrapper>
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.accentColor')}</Label>
                              <ColorInputWrapper>
                                <ColorInput
                                  type="color"
                                  name="accentColor"
                                  value={formData.accentColor || '#ffffff'}
                                  onChange={handleInputChange}
                                />
                                <Input
                                  type="text"
                                  value={formData.accentColor}
                                  onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                                  placeholder={t('admin.rarities.autoLighter')}
                                  style={{ flex: 1 }}
                                />
                              </ColorInputWrapper>
                            </FormGroup>
                          </FormRow>
                          <ColorPreview $color={formData.color} $accent={formData.accentColor || formData.color}>
                            <ColorPreviewSwatch $color={formData.color} />
                            <ColorPreviewText $color={formData.color}>{formData.displayName || t('admin.rarities.preview')}</ColorPreviewText>
                          </ColorPreview>
                        </SectionContent>
                      )}
                    </AnimatePresence>
                  </CollapsibleSection>

                  {/* Animation Settings - Collapsed by default */}
                  <CollapsibleSection $expanded={expandedSections.animation}>
                    <SectionHeader onClick={() => toggleSection('animation')}>
                      <SectionHeaderTitle>
                        <FaMagic /> {t('admin.rarities.animationSettings')}
                        <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                      </SectionHeaderTitle>
                      {expandedSections.animation ? <FaChevronUp /> : <FaChevronDown />}
                    </SectionHeader>
                    <AnimatePresence>
                      {expandedSections.animation && (
                        <SectionContent
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.glowIntensity')}</Label>
                              <Input
                                type="number"
                                name="glowIntensity"
                                value={formData.glowIntensity}
                                onChange={handleNumberChange}
                                step="0.1"
                                min="0"
                                max="1"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.buildupTime')}</Label>
                              <Input
                                type="number"
                                name="buildupTime"
                                value={formData.buildupTime}
                                onChange={handleNumberChange}
                                min="0"
                                step="100"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.confettiCount')}</Label>
                              <Input
                                type="number"
                                name="confettiCount"
                                value={formData.confettiCount}
                                onChange={handleNumberChange}
                                min="0"
                              />
                            </FormGroup>
                          </FormRow>
                          <FormRow>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.orbCount')}</Label>
                              <Input
                                type="number"
                                name="orbCount"
                                value={formData.orbCount}
                                onChange={handleNumberChange}
                                min="0"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }}>
                              <Label>{t('admin.rarities.ringCount')}</Label>
                              <Input
                                type="number"
                                name="ringCount"
                                value={formData.ringCount}
                                onChange={handleNumberChange}
                                min="0"
                              />
                            </FormGroup>
                            <FormGroup style={{ flex: 1 }} />
                          </FormRow>
                        </SectionContent>
                      )}
                    </AnimatePresence>
                  </CollapsibleSection>

                  <FormRow style={{ marginTop: theme.spacing.lg }}>
                    <SecondaryButton type="button" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                      {t('common.cancel')}
                    </SecondaryButton>
                    <PrimaryButton type="submit" style={{ flex: 2 }}>
                      {editingRarity ? t('admin.rarities.saveChanges') : t('admin.rarities.createRarity')}
                    </PrimaryButton>
                  </FormRow>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </AdminContainer>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const InfoBox = styled.div`
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const InfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(10, 132, 255, 0.15);
  color: ${theme.colors.info || '#0a84ff'};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  
  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

const InfoContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

const QuickGuideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const GuideItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: flex-start;
`;

const GuideIcon = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const GuideText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.4;
  
  strong {
    color: ${theme.colors.text};
    display: block;
    margin-bottom: 2px;
  }
`;

// Simulator styles
const SimulatorBox = styled(motion.div)`
  background: rgba(48, 209, 88, 0.08);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const SimulatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(48, 209, 88, 0.15);
  color: ${theme.colors.success};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  flex-wrap: wrap;
  
  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

const SimulatorControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.normal};
  color: ${theme.colors.textSecondary};
`;

const SimulatorInput = styled.input`
  width: 80px;
  padding: 4px 8px;
  border: 1px solid rgba(48, 209, 88, 0.4);
  border-radius: ${theme.radius.sm};
  background: rgba(0, 0, 0, 0.2);
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
`;

const SimulatorContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

const SimulatorNote = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.md};
`;

const SimulatorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SimulatorPool = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.md};
  padding: ${theme.spacing.sm};
`;

const SimulatorPoolTitle = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SimulatorRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: ${theme.fontSizes.xs};
`;

const SimulatorRarity = styled.span`
  color: ${props => props.$color};
  font-weight: ${theme.fontWeights.semibold};
`;

const SimulatorValue = styled.span`
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.bold};
`;

const SimulatorPercent = styled.span`
  color: ${theme.colors.textMuted};
  font-weight: ${theme.fontWeights.normal};
  font-size: 10px;
  margin-left: 4px;
`;

const SimulatorMainRate = styled.span`
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const WarningBox = styled.div`
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.3);
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 159, 10, 0.15);
  color: ${theme.colors.warning};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  
  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

const WarningContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
`;

const WarningText = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const RateTotalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const RateTotalItem = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$isValid 
    ? 'rgba(48, 209, 88, 0.1)' 
    : 'rgba(255, 69, 58, 0.1)'};
  border: 1px solid ${props => props.$isValid 
    ? 'rgba(48, 209, 88, 0.3)' 
    : 'rgba(255, 69, 58, 0.3)'};
  border-radius: ${theme.radius.md};
`;

const RateTotalLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-bottom: 2px;
`;

const RateTotalValue = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isValid ? theme.colors.success : theme.colors.error};
  
  span {
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.normal};
    color: ${theme.colors.textMuted};
  }
`;

const RarityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const RarityCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$color};
  }
`;

const RarityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const RarityName = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const RarityBadge = styled.span`
  padding: 4px 12px;
  background: ${props => props.$color}20;
  border: 1px solid ${props => props.$color}40;
  border-radius: ${theme.radius.full};
  color: ${props => props.$color};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
`;

const RarityBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const RaritySection = styled.div`
  margin-bottom: ${theme.spacing.md};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.sm};
  
  svg {
    font-size: 10px;
  }
`;

const RateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.sm};
`;

const RateItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const RateLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  margin-bottom: 2px;
`;

const RateValue = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const EffectiveRate = styled.div`
  font-size: 9px;
  color: ${theme.colors.textMuted};
  margin-top: 2px;
  font-style: italic;
`;

const FieldHint = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  margin-top: 4px;
  line-height: 1.3;
`;

const VisualRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ColorSwatch = styled.div`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color};
  border: 2px solid ${theme.colors.surfaceBorder};
`;

const VisualInfo = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const RarityMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const MetaItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  padding: 2px 8px;
  border-radius: ${theme.radius.md};
  background: ${props => 
    props.$highlight ? 'rgba(48, 209, 88, 0.15)' : 
    props.$warning ? 'rgba(255, 159, 10, 0.15)' : 
    theme.colors.backgroundTertiary};
  color: ${props => 
    props.$highlight ? theme.colors.success : 
    props.$warning ? theme.colors.warning : 
    props.$muted ? theme.colors.textMuted : 
    theme.colors.textSecondary};
`;

const RarityActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
`;

// Modal Form Styles
const PresetSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.2);
  border-radius: ${theme.radius.lg};
`;

const PresetLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.sm};
  
  svg {
    font-size: ${theme.fontSizes.md};
  }
`;

const PresetGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const PresetButton = styled.button`
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 159, 10, 0.2);
    border-color: ${theme.colors.warning};
    color: ${theme.colors.warning};
  }
`;

const CollapsibleSection = styled.div`
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  background: ${props => props.$expanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent'};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  
  svg:last-child {
    color: ${theme.colors.textMuted};
    font-size: 12px;
  }
`;

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  
  svg {
    color: ${theme.colors.primary};
    font-size: ${theme.fontSizes.sm};
  }
`;

const SectionBadge = styled.span`
  font-size: 10px;
  font-weight: ${theme.fontWeights.normal};
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  background: ${props => props.$muted ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 132, 255, 0.15)'};
  color: ${props => props.$muted ? theme.colors.textMuted : theme.colors.primary};
`;

const SectionContent = styled(motion.div)`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
  overflow: hidden;
`;

const CopyButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 6px 12px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(10, 132, 255, 0.2);
    border-color: ${theme.colors.primary};
  }
  
  svg {
    font-size: 10px;
  }
`;

const RateGroupLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  
  &:first-child {
    margin-top: 0;
  }
`;

const AdvancedNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(10, 132, 255, 0.08);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
  line-height: 1.4;
  
  svg {
    color: ${theme.colors.info};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const LabelWithTooltip = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const Tooltip = styled.span`
  color: ${theme.colors.textMuted};
  cursor: help;
  
  svg {
    font-size: 11px;
  }
  
  &:hover {
    color: ${theme.colors.primary};
  }
`;

const ColorInputWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const ColorInput = styled.input`
  width: 48px;
  height: 48px;
  padding: 0;
  border: 2px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  
  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
`;

const ColorPreview = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => props.$color}40;
`;

const ColorPreviewSwatch = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color};
  box-shadow: 0 0 20px ${props => props.$color}50;
`;

const ColorPreviewText = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
  text-shadow: 0 0 10px ${props => props.$color}50;
`;

export default AdminRarities;
