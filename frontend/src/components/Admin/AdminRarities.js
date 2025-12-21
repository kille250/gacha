import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaEdit, FaTrash, FaPlus, FaUndo, FaPercent, FaPalette, FaMagic, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { useTranslation } from 'react-i18next';
import { getRarities, createRarity, updateRarity, deleteRarity, resetDefaultRarities } from '../../utils/api';
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

const AdminRarities = ({ onRefresh }) => {
  const { t } = useTranslation();
  const [rarities, setRarities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRarity, setEditingRarity] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());

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
      const hasCommonMinimum = pool.key.includes('banner') || pool.key.includes('standard');
      const commonRate = rarities.find(r => r.name === 'common')?.[pool.field] || 0;
      
      // Calculate effective rates after normalization
      const effectiveRates = {};
      rarities.forEach(r => {
        effectiveRates[r.name] = total > 0 ? ((r[pool.field] || 0) / total * 100).toFixed(1) : 0;
      });
      
      return {
        ...pool,
        total,
        isValid: Math.abs(total - 100) < 0.1,
        hasCommonMinimum,
        commonRate,
        effectiveRates,
      };
    });
  }, [rarities]);

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
    setShowModal(true);
  };

  const handleAddClick = () => {
    setEditingRarity(null);
    setFormData(getEmptyFormData());
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
      } else {
        await createRarity(submitData);
      }
      
      await fetchRarities();
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
      await fetchRarities();
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
      await fetchRarities();
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
            Retry
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
          <ActionButton $variant="warning" onClick={handleResetDefaults}>
            <FaUndo /> {t('admin.rarities.resetDefaults')}
          </ActionButton>
        </ActionGroup>
      </ActionBar>

      {/* Rate System Info Box */}
      <InfoBox>
        <InfoHeader>
          <FaInfoCircle /> {t('admin.rarities.infoTitle')}
        </InfoHeader>
        <InfoContent>
          <InfoText>
            <strong>Rate Normalization:</strong> {t('admin.rarities.infoNormalization')}{' '}
            <code>{t('admin.rarities.infoNormalizationFormula')}</code>
          </InfoText>
          <InfoText>
            <strong>Minimum Rate:</strong> {t('admin.rarities.infoMinimumRate')}{' '}
            <strong>{t('admin.rarities.infoMinimumRateTip')}</strong>
          </InfoText>
          <InfoText>
            <strong>Banner Rate Multiplier:</strong> {t('admin.rarities.infoMultiplier')}
          </InfoText>
          <InfoText>
            <strong>{t('admin.rarities.infoHowTo100')}</strong> {t('admin.rarities.infoHowTo100Steps')}
          </InfoText>
        </InfoContent>
      </InfoBox>

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
                    {!pool.isValid && <span> → {t('admin.rarities.normalizedTo100')}</span>}
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
            onClick={() => setShowModal(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              $maxWidth="700px"
            >
              <ModalHeader>
                <ModalTitle $iconColor={theme.colors.warning}>
                  <FaStar /> {editingRarity ? t('admin.rarities.editRarity') : t('admin.rarities.addRarity')}
                </ModalTitle>
                <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
              </ModalHeader>
              
              <ModalBody>
                <form onSubmit={handleSubmit}>
                  {/* Basic Info */}
                  <FormSection>
                    <FormSectionTitle>{t('admin.rarities.basicInfo')}</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>{t('admin.rarities.internalName')}</Label>
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
                        <Label>{t('admin.rarities.order')}</Label>
                        <Input
                          type="number"
                          name="order"
                          value={formData.order}
                          onChange={handleNumberChange}
                          min="0"
                        />
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  {/* Drop Rates */}
                  <FormSection>
                    <FormSectionTitle><FaPercent /> {t('admin.rarities.dropRatesPercent')}</FormSectionTitle>
                    <RateFormGrid>
                      <FormGroup>
                        <Label>{t('admin.rarities.standardSingle')}</Label>
                        <Input
                          type="number"
                          name="dropRateStandardSingle"
                          value={formData.dropRateStandardSingle}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.standardMulti')}</Label>
                        <Input
                          type="number"
                          name="dropRateStandardMulti"
                          value={formData.dropRateStandardMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.bannerSingle')}</Label>
                        <Input
                          type="number"
                          name="dropRateBannerSingle"
                          value={formData.dropRateBannerSingle}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.bannerMulti')}</Label>
                        <Input
                          type="number"
                          name="dropRateBannerMulti"
                          value={formData.dropRateBannerMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.premiumSingle')}</Label>
                        <Input
                          type="number"
                          name="dropRatePremiumSingle"
                          value={formData.dropRatePremiumSingle}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.premiumMulti')}</Label>
                        <Input
                          type="number"
                          name="dropRatePremiumMulti"
                          value={formData.dropRatePremiumMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>{t('admin.rarities.pity')}</Label>
                        <Input
                          type="number"
                          name="dropRatePity"
                          value={formData.dropRatePity}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </FormGroup>
                    </RateFormGrid>
                  </FormSection>

                  {/* Caps & Scaling */}
                  <FormSection>
                    <FormSectionTitle>{t('admin.rarities.bannerMultiplierSettings')}</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>{t('admin.rarities.capSingle')}</Label>
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
                        <Label>{t('admin.rarities.capMulti')}</Label>
                        <Input
                          type="number"
                          name="capMulti"
                          value={formData.capMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          placeholder={t('admin.rarities.noCap')}
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>{t('admin.rarities.multiplierScaling')}</Label>
                        <Input
                          type="number"
                          name="multiplierScaling"
                          value={formData.multiplierScaling}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>{t('admin.rarities.minimumRate')}</Label>
                        <Input
                          type="number"
                          name="minimumRate"
                          value={formData.minimumRate}
                          onChange={handleNumberChange}
                          step="1"
                          min="0"
                          max="100"
                        />
                        <FieldHint>{t('admin.rarities.minimumRateHint')}</FieldHint>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  {/* Visual Settings */}
                  <FormSection>
                    <FormSectionTitle><FaPalette /> {t('admin.rarities.visualSettings')}</FormSectionTitle>
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
                            placeholder={t('admin.rarities.accentColorAuto')}
                            style={{ flex: 1 }}
                          />
                        </ColorInputWrapper>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  {/* Animation Settings */}
                  <FormSection>
                    <FormSectionTitle><FaMagic /> {t('admin.rarities.animationSettings')}</FormSectionTitle>
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
                      <FormGroup style={{ flex: 1 }}>
                        <Label>&nbsp;</Label>
                        <CheckboxLabel $padded>
                          <input
                            type="checkbox"
                            name="isPityEligible"
                            checked={formData.isPityEligible}
                            onChange={handleInputChange}
                          />
                          <span>{t('admin.rarities.isPityEligible')}</span>
                        </CheckboxLabel>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

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

const InfoText = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  strong {
    color: ${theme.colors.text};
  }
  
  code {
    background: ${theme.colors.backgroundTertiary};
    padding: 2px 6px;
    border-radius: ${theme.radius.sm};
    font-family: monospace;
    font-size: ${theme.fontSizes.xs};
  }
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

const FormSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  
  &:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const FormSectionTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  
  svg {
    color: ${theme.colors.primary};
  }
`;

const RateFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
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

export default AdminRarities;

