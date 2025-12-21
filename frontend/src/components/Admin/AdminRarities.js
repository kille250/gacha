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
  // eslint-disable-next-line no-unused-vars
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
      alert('Cannot delete default rarities. You can only modify their settings.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete "${rarity.displayName}"?`)) {
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
    if (!window.confirm('Reset all default rarities to their original values? This will not affect custom rarities.')) {
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
          <EmptyText>Loading rarities...</EmptyText>
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
          <FaStar /> Rarity Configuration
          <ItemCount>{rarities.length} rarities</ItemCount>
        </SectionTitle>
      </HeaderRow>
      
      <ActionBar>
        <ActionGroup>
          <ActionButton onClick={handleAddClick}>
            <FaPlus /> Add Rarity
          </ActionButton>
          <ActionButton $variant="warning" onClick={handleResetDefaults}>
            <FaUndo /> Reset Defaults
          </ActionButton>
        </ActionGroup>
      </ActionBar>

      {/* Rate System Info Box */}
      <InfoBox>
        <InfoHeader>
          <FaInfoCircle /> How Drop Rates Work
        </InfoHeader>
        <InfoContent>
          <InfoText>
            <strong>Rate Normalization:</strong> Rates are normalized to sum to 100%. 
            If you set one rarity to 100% but others have non-zero rates, the actual probability 
            will be calculated as: <code>your_rate ÷ total_of_all_rates</code>
          </InfoText>
          <InfoText>
            <strong>Minimum Rate:</strong> Each rarity has a configurable <code>Minimum Rate</code> that 
            acts as a floor for banner pulls. By default, Common has 35% minimum. 
            <strong> Set to 0 to allow true 100% guaranteed banners.</strong>
          </InfoText>
          <InfoText>
            <strong>Banner Rate Multiplier:</strong> Each banner has a rate multiplier (default 5×) that boosts 
            rare+ rates, but each rarity has a cap that limits the maximum boost.
          </InfoText>
          <InfoText>
            <strong>To create a 100% Legendary banner:</strong> Set Legendary's banner rate to 100%, 
            all other rarities to 0%, and set Common's Minimum Rate to 0%.
          </InfoText>
        </InfoContent>
      </InfoBox>

      {/* Rate Totals Warning */}
      {hasInvalidTotals && rateTotals && (
        <WarningBox>
          <WarningHeader>
            <FaExclamationTriangle /> Rate Totals Don't Equal 100%
          </WarningHeader>
          <WarningContent>
            <WarningText>
              Some rate pools don't sum to 100%. Rates will be normalized during rolls, 
              which may produce unexpected probabilities.
            </WarningText>
            <RateTotalsGrid>
              {rateTotals.map(pool => (
                <RateTotalItem key={pool.key} $isValid={pool.isValid}>
                  <RateTotalLabel>{pool.label}</RateTotalLabel>
                  <RateTotalValue $isValid={pool.isValid}>
                    {pool.total.toFixed(1)}%
                    {!pool.isValid && <span> → normalized to 100%</span>}
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
          <EmptyText>No rarities configured</EmptyText>
          <EmptySubtext>Add rarities to define drop rates and visual styles</EmptySubtext>
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
                    <SectionLabel><FaPercent /> Drop Rates (Single / Multi)</SectionLabel>
                    <RateGrid>
                      <RateItem>
                        <RateLabel>Standard</RateLabel>
                        <RateValue>{rarity.dropRateStandardSingle}% / {rarity.dropRateStandardMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'standardSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'standardMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>Banner</RateLabel>
                        <RateValue>{rarity.dropRateBannerSingle}% / {rarity.dropRateBannerMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'bannerSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'bannerMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>Premium</RateLabel>
                        <RateValue>{rarity.dropRatePremiumSingle}% / {rarity.dropRatePremiumMulti}%</RateValue>
                        {rateTotals && (
                          <EffectiveRate>
                            → {rateTotals.find(p => p.key === 'premiumSingle')?.effectiveRates[rarity.name]}% / {rateTotals.find(p => p.key === 'premiumMulti')?.effectiveRates[rarity.name]}%
                          </EffectiveRate>
                        )}
                      </RateItem>
                      <RateItem>
                        <RateLabel>Pity</RateLabel>
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
                    <SectionLabel><FaPalette /> Visual</SectionLabel>
                    <VisualRow>
                      <ColorSwatch $color={rarity.color} title="Primary Color" />
                      {rarity.accentColor && (
                        <ColorSwatch $color={rarity.accentColor} title="Accent Color" />
                      )}
                      <VisualInfo>
                        <span>Glow: {Math.round(rarity.glowIntensity * 100)}%</span>
                        <span>Orbs: {rarity.orbCount}</span>
                      </VisualInfo>
                    </VisualRow>
                  </RaritySection>
                  
                  <RarityMeta>
                    <MetaItem>Order: {rarity.order}</MetaItem>
                    {rarity.minimumRate > 0 && (
                      <MetaItem $warning>Min: {rarity.minimumRate}%</MetaItem>
                    )}
                    {rarity.isPityEligible && <MetaItem $highlight>Pity Eligible</MetaItem>}
                    {rarity.isDefault && <MetaItem $muted>Default</MetaItem>}
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
                  <FaStar /> {editingRarity ? 'Edit Rarity' : 'Add Rarity'}
                </ModalTitle>
                <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
              </ModalHeader>
              
              <ModalBody>
                <form onSubmit={handleSubmit}>
                  {/* Basic Info */}
                  <FormSection>
                    <FormSectionTitle>Basic Information</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Internal Name</Label>
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
                        <Label>Display Name</Label>
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
                        <Label>Order</Label>
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
                    <FormSectionTitle><FaPercent /> Drop Rates (%)</FormSectionTitle>
                    <RateFormGrid>
                      <FormGroup>
                        <Label>Standard Single</Label>
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
                        <Label>Standard Multi</Label>
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
                        <Label>Banner Single</Label>
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
                        <Label>Banner Multi</Label>
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
                        <Label>Premium Single</Label>
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
                        <Label>Premium Multi</Label>
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
                        <Label>Pity</Label>
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
                    <FormSectionTitle>Banner Multiplier Settings</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Cap Single (%)</Label>
                        <Input
                          type="number"
                          name="capSingle"
                          value={formData.capSingle}
                          onChange={handleNumberChange}
                          step="0.1"
                          placeholder="No cap"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Cap Multi (%)</Label>
                        <Input
                          type="number"
                          name="capMulti"
                          value={formData.capMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          placeholder="No cap"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Multiplier Scaling</Label>
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
                        <Label>Minimum Rate (%)</Label>
                        <Input
                          type="number"
                          name="minimumRate"
                          value={formData.minimumRate}
                          onChange={handleNumberChange}
                          step="1"
                          min="0"
                          max="100"
                        />
                        <FieldHint>Floor rate for banner pulls. Set to 0 to allow true 100% banners.</FieldHint>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  {/* Visual Settings */}
                  <FormSection>
                    <FormSectionTitle><FaPalette /> Visual Settings</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Primary Color</Label>
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
                        <Label>Accent Color (optional)</Label>
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
                            placeholder="Auto"
                            style={{ flex: 1 }}
                          />
                        </ColorInputWrapper>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  {/* Animation Settings */}
                  <FormSection>
                    <FormSectionTitle><FaMagic /> Animation Settings</FormSectionTitle>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Glow Intensity (0-1)</Label>
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
                        <Label>Buildup Time (ms)</Label>
                        <Input
                          type="number"
                          name="buildupTime"
                          value={formData.buildupTime}
                          onChange={handleNumberChange}
                          min="0"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Confetti Count</Label>
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
                        <Label>Orb Count</Label>
                        <Input
                          type="number"
                          name="orbCount"
                          value={formData.orbCount}
                          onChange={handleNumberChange}
                          min="0"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label>Ring Count</Label>
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
                          <span>Pity Eligible (rare+)</span>
                        </CheckboxLabel>
                      </FormGroup>
                    </FormRow>
                  </FormSection>

                  <FormRow style={{ marginTop: theme.spacing.lg }}>
                    <SecondaryButton type="button" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton type="submit" style={{ flex: 2 }}>
                      {editingRarity ? 'Save Changes' : 'Create Rarity'}
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

