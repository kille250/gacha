/**
 * RarityFormModal - Form for creating/editing rarities
 *
 * Features:
 * - Collapsible sections for organized editing
 * - Preset quick-start buttons for new rarities
 * - Copy single rates to multi functionality
 * - Color preview with live updates
 * - Proper form validation with accessible error states
 *
 * Accessibility:
 * - All form fields have proper labels
 * - Error states use aria-invalid and aria-describedby
 * - Sections are expandable with keyboard
 * - Focus management on modal open
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence } from 'framer-motion';
import {
  FaStar, FaInfoCircle, FaPercent, FaCog, FaPalette, FaMagic,
  FaChevronDown, FaChevronUp, FaCopy, FaLightbulb, FaQuestionCircle,
  FaHourglass, FaCheck, FaExclamationCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../design-system';
import {
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
  CheckboxLabel,
  FieldError,
} from '../AdminStyles';
import { RARITY_PRESETS, FIELD_TOOLTIP_KEYS } from './RarityPresets';
import {
  PresetSection,
  PresetLabel,
  PresetGrid,
  PresetButton,
  CollapsibleSection,
  SectionHeader,
  SectionHeaderTitle,
  SectionBadge,
  SectionContent,
  CopyButtonRow,
  CopyButton,
  RateGroupLabel,
  AdvancedNote,
  LabelWithTooltip,
  Tooltip,
  FieldHint,
  ColorInputWrapper,
  ColorInput,
  ColorPreview,
  ColorPreviewSwatch,
  ColorPreviewText,
} from './RarityStyles';

const RarityFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingRarity,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    rates: true,
    advanced: false,
    visual: false,
    animation: false
  });

  // Reset sections when editing changes
  useEffect(() => {
    if (isOpen) {
      setExpandedSections({
        basic: true,
        rates: true,
        advanced: false,
        visual: false,
        animation: false
      });
      setErrors({});
      // Focus first input when modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingRarity]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [setFormData, errors]);

  const handleNumberChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || 0
    }));
  }, [setFormData]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleSectionKeyDown = useCallback((e, section) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSection(section);
    }
  }, [toggleSection]);

  const applyPreset = useCallback((presetKey) => {
    const preset = RARITY_PRESETS[presetKey];
    if (!preset) return;

    setFormData(prev => ({
      ...prev,
      ...preset.values
    }));
  }, [setFormData]);

  const copySingleToMulti = useCallback((adjustment = 0) => {
    setFormData(prev => ({
      ...prev,
      dropRateStandardMulti: Math.max(0, prev.dropRateStandardSingle + adjustment),
      dropRateBannerMulti: Math.max(0, prev.dropRateBannerSingle + adjustment),
      dropRatePremiumMulti: Math.max(0, prev.dropRatePremiumSingle + adjustment),
      capMulti: prev.capSingle,
    }));
  }, [setFormData]);

  // Validate form before submission
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = t('admin.rarities.errorNameRequired', 'Internal name is required');
    }
    if (!formData.displayName?.trim()) {
      newErrors.displayName = t('admin.rarities.errorDisplayNameRequired', 'Display name is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(e);
    }
  }, [validateForm, onSubmit]);

  if (!isOpen) return null;

  return (
    <ModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rarity-modal-title"
    >
      <ModalContent
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        $maxWidth="750px"
      >
        <ModalHeader>
          <ModalTitle id="rarity-modal-title" $iconColor={theme.colors.warning}>
            <FaStar aria-hidden="true" />
            {editingRarity
              ? t('admin.rarities.editRarity')
              : t('admin.rarities.addRarity')
            }
          </ModalTitle>
          <CloseButton
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Preset Buttons - only show when adding new */}
          {!editingRarity && (
            <PresetSection>
              <PresetLabel>
                <FaLightbulb aria-hidden="true" />
                {t('admin.rarities.presetQuickStart')}
              </PresetLabel>
              <PresetGrid role="group" aria-label={t('admin.rarities.presetQuickStart')}>
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

          <form onSubmit={handleSubmit} noValidate>
            {/* Basic Info Section */}
            <CollapsibleSection $expanded={expandedSections.basic}>
              <SectionHeader
                onClick={() => toggleSection('basic')}
                onKeyDown={(e) => handleSectionKeyDown(e, 'basic')}
                role="button"
                tabIndex={0}
                aria-expanded={expandedSections.basic}
                aria-controls="section-basic"
              >
                <SectionHeaderTitle>
                  <FaInfoCircle aria-hidden="true" />
                  {t('admin.rarities.basicInfo')}
                </SectionHeaderTitle>
                {expandedSections.basic
                  ? <FaChevronUp aria-hidden="true" />
                  : <FaChevronDown aria-hidden="true" />
                }
              </SectionHeader>
              <AnimatePresence>
                {expandedSections.basic && (
                  <SectionContent
                    id="section-basic"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <LabelWithTooltip>
                          <Label htmlFor="rarity-name">
                            {t('admin.rarities.internalName')}
                            <span aria-hidden="true" style={{ color: theme.colors.error }}> *</span>
                          </Label>
                          <Tooltip title={t('admin.rarities.internalNameHint', 'Unique identifier used in code (lowercase, no spaces)')}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          ref={firstInputRef}
                          id="rarity-name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., mythic"
                          disabled={editingRarity?.isDefault}
                          required
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? 'name-error' : undefined}
                        />
                        {errors.name && (
                          <FieldError id="name-error" role="alert">
                            <FaExclamationCircle aria-hidden="true" />
                            {errors.name}
                          </FieldError>
                        )}
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="rarity-displayName">
                          {t('admin.rarities.displayName')}
                          <span aria-hidden="true" style={{ color: theme.colors.error }}> *</span>
                        </Label>
                        <Input
                          id="rarity-displayName"
                          type="text"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          placeholder="e.g., Mythic"
                          required
                          aria-invalid={!!errors.displayName}
                          aria-describedby={errors.displayName ? 'displayName-error' : undefined}
                        />
                        {errors.displayName && (
                          <FieldError id="displayName-error" role="alert">
                            <FaExclamationCircle aria-hidden="true" />
                            {errors.displayName}
                          </FieldError>
                        )}
                      </FormGroup>
                      <FormGroup style={{ width: '100px' }}>
                        <LabelWithTooltip>
                          <Label htmlFor="rarity-order">{t('admin.rarities.order')}</Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.order}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="rarity-order"
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

            {/* Drop Rates Section */}
            <CollapsibleSection $expanded={expandedSections.rates}>
              <SectionHeader
                onClick={() => toggleSection('rates')}
                onKeyDown={(e) => handleSectionKeyDown(e, 'rates')}
                role="button"
                tabIndex={0}
                aria-expanded={expandedSections.rates}
                aria-controls="section-rates"
              >
                <SectionHeaderTitle>
                  <FaPercent aria-hidden="true" />
                  {t('admin.rarities.dropRatesPercent')}
                  <SectionBadge>{t('admin.rarities.coreSettings')}</SectionBadge>
                </SectionHeaderTitle>
                {expandedSections.rates
                  ? <FaChevronUp aria-hidden="true" />
                  : <FaChevronDown aria-hidden="true" />
                }
              </SectionHeader>
              <AnimatePresence>
                {expandedSections.rates && (
                  <SectionContent
                    id="section-rates"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {/* Copy buttons */}
                    <CopyButtonRow>
                      <CopyButton type="button" onClick={() => copySingleToMulti(0)}>
                        <FaCopy aria-hidden="true" />
                        {t('admin.rarities.copySingleToMultiSame')}
                      </CopyButton>
                      <CopyButton type="button" onClick={() => copySingleToMulti(2)}>
                        <FaCopy aria-hidden="true" />
                        {t('admin.rarities.copySingleToMultiPlus2')}
                      </CopyButton>
                    </CopyButtonRow>

                    {/* Standard Pool */}
                    <RateGroupLabel id="standard-pool-label">
                      {t('admin.rarities.standardPool')}
                    </RateGroupLabel>
                    <FormRow role="group" aria-labelledby="standard-pool-label">
                      <FormGroup style={{ flex: 1 }}>
                        <LabelWithTooltip>
                          <Label htmlFor="dropRateStandardSingle">
                            {t('admin.rarities.singlePullPercent')}
                          </Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRateStandardSingle}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="dropRateStandardSingle"
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
                          <Label htmlFor="dropRateStandardMulti">
                            {t('admin.rarities.multiPullPercent')}
                          </Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRateStandardMulti}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="dropRateStandardMulti"
                          type="number"
                          name="dropRateStandardMulti"
                          value={formData.dropRateStandardMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                        />
                      </FormGroup>
                    </FormRow>

                    {/* Banner Pool */}
                    <RateGroupLabel id="banner-pool-label">
                      {t('admin.rarities.bannerPool')}
                    </RateGroupLabel>
                    <FormRow role="group" aria-labelledby="banner-pool-label">
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="dropRateBannerSingle">
                          {t('admin.rarities.singlePullPercent')}
                        </Label>
                        <Input
                          id="dropRateBannerSingle"
                          type="number"
                          name="dropRateBannerSingle"
                          value={formData.dropRateBannerSingle}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="dropRateBannerMulti">
                          {t('admin.rarities.multiPullPercent')}
                        </Label>
                        <Input
                          id="dropRateBannerMulti"
                          type="number"
                          name="dropRateBannerMulti"
                          value={formData.dropRateBannerMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                        />
                      </FormGroup>
                    </FormRow>

                    {/* Premium Pool */}
                    <RateGroupLabel id="premium-pool-label">
                      {t('admin.rarities.premiumPool')}
                    </RateGroupLabel>
                    <FormRow role="group" aria-labelledby="premium-pool-label">
                      <FormGroup style={{ flex: 1 }}>
                        <LabelWithTooltip>
                          <Label htmlFor="dropRatePremiumSingle">
                            {t('admin.rarities.singlePullPercent')}
                          </Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRatePremiumSingle}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="dropRatePremiumSingle"
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
                        <Label htmlFor="dropRatePremiumMulti">
                          {t('admin.rarities.multiPullPercent')}
                        </Label>
                        <Input
                          id="dropRatePremiumMulti"
                          type="number"
                          name="dropRatePremiumMulti"
                          value={formData.dropRatePremiumMulti}
                          onChange={handleNumberChange}
                          step="0.1"
                          min="0"
                        />
                      </FormGroup>
                    </FormRow>

                    {/* Pity System */}
                    <RateGroupLabel id="pity-system-label">
                      {t('admin.rarities.pitySystem')}
                    </RateGroupLabel>
                    <FormRow role="group" aria-labelledby="pity-system-label">
                      <FormGroup style={{ flex: 1 }}>
                        <LabelWithTooltip>
                          <Label htmlFor="dropRatePity">
                            {t('admin.rarities.pityRatePercent')}
                          </Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.dropRatePity}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="dropRatePity"
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
                            id="isPityEligible"
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

            {/* Advanced Settings Section */}
            <CollapsibleSection $expanded={expandedSections.advanced}>
              <SectionHeader
                onClick={() => toggleSection('advanced')}
                onKeyDown={(e) => handleSectionKeyDown(e, 'advanced')}
                role="button"
                tabIndex={0}
                aria-expanded={expandedSections.advanced}
                aria-controls="section-advanced"
              >
                <SectionHeaderTitle>
                  <FaCog aria-hidden="true" />
                  {t('admin.rarities.advancedBannerSettings')}
                  <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                </SectionHeaderTitle>
                {expandedSections.advanced
                  ? <FaChevronUp aria-hidden="true" />
                  : <FaChevronDown aria-hidden="true" />
                }
              </SectionHeader>
              <AnimatePresence>
                {expandedSections.advanced && (
                  <SectionContent
                    id="section-advanced"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <AdvancedNote>
                      <FaInfoCircle aria-hidden="true" />
                      {t('admin.rarities.advancedNote')}
                    </AdvancedNote>
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <LabelWithTooltip>
                          <Label htmlFor="capSingle">{t('admin.rarities.capSingleLabel')}</Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.capSingle}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="capSingle"
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
                          <Label htmlFor="capMulti">{t('admin.rarities.capMultiLabel')}</Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.capMulti}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="capMulti"
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
                          <Label htmlFor="multiplierScaling">
                            {t('admin.rarities.multiplierScaling')}
                          </Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.multiplierScaling}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="multiplierScaling"
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
                          <Label htmlFor="minimumRate">{t('admin.rarities.minimumRate')}</Label>
                          <Tooltip title={t(`admin.rarities.${FIELD_TOOLTIP_KEYS.minimumRate}`)}>
                            <FaQuestionCircle aria-hidden="true" />
                          </Tooltip>
                        </LabelWithTooltip>
                        <Input
                          id="minimumRate"
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

            {/* Visual Settings Section */}
            <CollapsibleSection $expanded={expandedSections.visual}>
              <SectionHeader
                onClick={() => toggleSection('visual')}
                onKeyDown={(e) => handleSectionKeyDown(e, 'visual')}
                role="button"
                tabIndex={0}
                aria-expanded={expandedSections.visual}
                aria-controls="section-visual"
              >
                <SectionHeaderTitle>
                  <FaPalette aria-hidden="true" />
                  {t('admin.rarities.visualSettings')}
                  <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                </SectionHeaderTitle>
                {expandedSections.visual
                  ? <FaChevronUp aria-hidden="true" />
                  : <FaChevronDown aria-hidden="true" />
                }
              </SectionHeader>
              <AnimatePresence>
                {expandedSections.visual && (
                  <SectionContent
                    id="section-visual"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="color">{t('admin.rarities.primaryColor')}</Label>
                        <ColorInputWrapper>
                          <ColorInput
                            id="color"
                            type="color"
                            name="color"
                            value={formData.color}
                            onChange={handleInputChange}
                            aria-label={t('admin.rarities.primaryColor')}
                          />
                          <Input
                            type="text"
                            value={formData.color}
                            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                            style={{ flex: 1 }}
                            aria-label={t('admin.rarities.primaryColorHex')}
                          />
                        </ColorInputWrapper>
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="accentColor">{t('admin.rarities.accentColor')}</Label>
                        <ColorInputWrapper>
                          <ColorInput
                            id="accentColor"
                            type="color"
                            name="accentColor"
                            value={formData.accentColor || '#ffffff'}
                            onChange={handleInputChange}
                            aria-label={t('admin.rarities.accentColor')}
                          />
                          <Input
                            type="text"
                            value={formData.accentColor}
                            onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                            placeholder={t('admin.rarities.autoLighter')}
                            style={{ flex: 1 }}
                            aria-label={t('admin.rarities.accentColorHex')}
                          />
                        </ColorInputWrapper>
                      </FormGroup>
                    </FormRow>
                    <ColorPreview
                      $color={formData.color}
                      $accent={formData.accentColor || formData.color}
                      role="img"
                      aria-label={`${t('admin.rarities.preview')}: ${formData.displayName || t('admin.rarities.preview')}`}
                    >
                      <ColorPreviewSwatch $color={formData.color} />
                      <ColorPreviewText $color={formData.color}>
                        {formData.displayName || t('admin.rarities.preview')}
                      </ColorPreviewText>
                    </ColorPreview>
                  </SectionContent>
                )}
              </AnimatePresence>
            </CollapsibleSection>

            {/* Animation Settings Section */}
            <CollapsibleSection $expanded={expandedSections.animation}>
              <SectionHeader
                onClick={() => toggleSection('animation')}
                onKeyDown={(e) => handleSectionKeyDown(e, 'animation')}
                role="button"
                tabIndex={0}
                aria-expanded={expandedSections.animation}
                aria-controls="section-animation"
              >
                <SectionHeaderTitle>
                  <FaMagic aria-hidden="true" />
                  {t('admin.rarities.animationSettings')}
                  <SectionBadge $muted>{t('admin.rarities.optional')}</SectionBadge>
                </SectionHeaderTitle>
                {expandedSections.animation
                  ? <FaChevronUp aria-hidden="true" />
                  : <FaChevronDown aria-hidden="true" />
                }
              </SectionHeader>
              <AnimatePresence>
                {expandedSections.animation && (
                  <SectionContent
                    id="section-animation"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <FormRow>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="glowIntensity">{t('admin.rarities.glowIntensity')}</Label>
                        <Input
                          id="glowIntensity"
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
                        <Label htmlFor="buildupTime">{t('admin.rarities.buildupTime')}</Label>
                        <Input
                          id="buildupTime"
                          type="number"
                          name="buildupTime"
                          value={formData.buildupTime}
                          onChange={handleNumberChange}
                          min="0"
                          step="100"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="confettiCount">{t('admin.rarities.confettiCount')}</Label>
                        <Input
                          id="confettiCount"
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
                        <Label htmlFor="orbCount">{t('admin.rarities.orbCount')}</Label>
                        <Input
                          id="orbCount"
                          type="number"
                          name="orbCount"
                          value={formData.orbCount}
                          onChange={handleNumberChange}
                          min="0"
                        />
                      </FormGroup>
                      <FormGroup style={{ flex: 1 }}>
                        <Label htmlFor="ringCount">{t('admin.rarities.ringCount')}</Label>
                        <Input
                          id="ringCount"
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

            {/* Form Actions */}
            <FormRow style={{ marginTop: theme.spacing.lg }}>
              <SecondaryButton
                type="button"
                onClick={onClose}
                style={{ flex: 1 }}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                style={{ flex: 2 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FaHourglass style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                    {t('common.saving', 'Saving...')}
                  </>
                ) : (
                  <>
                    <FaCheck aria-hidden="true" />
                    {editingRarity
                      ? t('admin.rarities.saveChanges')
                      : t('admin.rarities.createRarity')
                    }
                  </>
                )}
              </PrimaryButton>
            </FormRow>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

RarityFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  editingRarity: PropTypes.object,
  isSubmitting: PropTypes.bool,
};

export default React.memo(RarityFormModal);
