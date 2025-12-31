/**
 * PromptBuilder - Simple prompt builder for character image generation
 *
 * Provides UI controls for building prompts with:
 * - Custom prompt text
 * - Art style selection
 * - Pose and background presets
 * - Model selection
 * - Advanced parameters
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPaintBrush,
  FaMagic,
  FaImage,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaRandom,
  FaCopy,
  FaUndo
} from 'react-icons/fa';
import { theme, motionVariants } from '../../../design-system';
import {
  ART_STYLES,
  POSE_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_PARAMS,
  NEGATIVE_PROMPT_TEMPLATE
} from '../../../config/characterPrompts.config';
import { SAMPLER_NAMES, RECOMMENDED_MODELS, POST_PROCESSORS } from '../../../services/stableHordeService';
import { useToast } from '../../../context/ToastContext';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const BuilderContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const BuilderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BuilderTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.primary};
    border-color: ${theme.colors.primary};
  }
`;

const Section = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const SectionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary}10;
  }
`;

const SectionTitle = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};

  svg {
    color: ${theme.colors.primary};
  }
`;

const SectionContent = styled(motion.div)`
  padding: ${theme.spacing.sm} 0;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$cols || '1fr 1fr'};
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}20;
  }
`;

const TextArea = styled.textarea`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}20;
  }

  &::placeholder {
    color: ${theme.colors.textSecondary};
  }
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${theme.spacing.xs};
`;

const PresetButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.xs};
  background: ${props => props.$selected ? `${theme.colors.primary}20` : theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$selected ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${props => props.$selected ? theme.colors.primary : theme.colors.text};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    border-color: ${theme.colors.primary};
    background: ${theme.colors.primary}10;
  }
`;

const RangeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const RangeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RangeValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.primary};
  min-width: 40px;
  text-align: right;
`;

const RangeInput = styled.input`
  width: 100%;
  height: 4px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: 2px;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: ${theme.colors.primary};
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.2);
    }
  }
`;

const TextInput = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-family: monospace;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}20;
  }

  &::placeholder {
    color: ${theme.colors.textSecondary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: ${theme.colors.primary};
    cursor: pointer;
  }
`;

const MultiSelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const MultiSelectChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  min-height: 40px;
`;

const Chip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${props => props.$selected ? theme.colors.primary : theme.colors.surface};
  border: 1px solid ${props => props.$selected ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.$selected ? 'white' : theme.colors.text};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$selected ? theme.colors.primaryHover : theme.colors.backgroundTertiary};
    border-color: ${theme.colors.primary};
  }
`;

const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
`;

const SubSectionTitle = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HelpText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-style: italic;
`;

const PromptPreview = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const PromptPreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
`;

const PromptPreviewLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const PromptText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.5;
  word-break: break-word;
`;

const CharCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$warning ? theme.colors.warning : theme.colors.textSecondary};
`;

const GenerateButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${props => props.$isGenerating
    ? `${theme.colors.primary}80`
    : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
  };
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.6 : 1};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px ${theme.colors.primary}40;
  }

  svg {
    animation: ${props => props.$isGenerating ? 'spin 2s linear infinite' : 'none'};
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Build a prompt from the selected options
 */
const buildPrompt = (options) => {
  const parts = [];

  // Add custom prompt first (main description)
  if (options.customPrompt?.trim()) {
    parts.push(options.customPrompt.trim());
  }

  // Art style
  const artStyle = ART_STYLES[options.artStyle];
  if (artStyle?.suffix) {
    parts.push(artStyle.suffix);
  }

  // Pose
  const pose = POSE_PRESETS[options.pose];
  if (pose?.suffix) {
    parts.push(pose.suffix);
  }

  // Background
  const background = BACKGROUND_PRESETS[options.background];
  if (background?.suffix) {
    parts.push(background.suffix);
  }

  // Base quality tags
  parts.push('high quality', 'detailed', 'professional artwork');

  return parts.filter(Boolean).join(', ');
};

// ===========================================
// COMPONENT
// ===========================================

const PromptBuilder = ({
  onGenerate,
  isGenerating,
  availableModels
}) => {
  const { success } = useToast();

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    style: true,
    advanced: false
  });

  // Prompt options state
  const [options, setOptions] = useState({
    customPrompt: '',
    artStyle: 'anime',
    pose: 'portrait',
    background: 'simple',
    models: RECOMMENDED_MODELS.slice(0, 3)
  });

  // Advanced params state
  const [params, setParams] = useState({
    ...DEFAULT_PARAMS,
    width: 512,
    height: 768,
    steps: 30,
    cfg_scale: 7,
    sampler_name: 'k_euler_a',
    clip_skip: 2,
    karras: true,
    n: 1,
    seed: '',
    post_processing: []
  });

  // Build preview prompt
  const previewPrompt = useMemo(() => {
    return buildPrompt(options);
  }, [options]);

  // Toggle section
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Update option
  const updateOption = useCallback((key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update param
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Randomize style selections
  const randomize = useCallback(() => {
    const artStyleKeys = Object.keys(ART_STYLES);
    const poseKeys = Object.keys(POSE_PRESETS);
    const bgKeys = Object.keys(BACKGROUND_PRESETS);

    setOptions(prev => ({
      ...prev,
      artStyle: artStyleKeys[Math.floor(Math.random() * artStyleKeys.length)],
      pose: poseKeys[Math.floor(Math.random() * poseKeys.length)],
      background: bgKeys[Math.floor(Math.random() * bgKeys.length)]
    }));
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setOptions({
      customPrompt: '',
      artStyle: 'anime',
      pose: 'portrait',
      background: 'simple',
      models: RECOMMENDED_MODELS.slice(0, 3)
    });
    setParams({
      ...DEFAULT_PARAMS,
      width: 512,
      height: 768,
      steps: 30,
      cfg_scale: 7,
      sampler_name: 'k_euler_a',
      clip_skip: 2,
      karras: true,
      n: 1,
      seed: '',
      post_processing: []
    });
  }, []);

  // Toggle post-processor
  const togglePostProcessor = useCallback((processor) => {
    setParams(prev => {
      const current = prev.post_processing || [];
      const isSelected = current.includes(processor);
      return {
        ...prev,
        post_processing: isSelected
          ? current.filter(p => p !== processor)
          : [...current, processor]
      };
    });
  }, []);

  // Copy prompt
  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewPrompt);
      success('Prompt copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [previewPrompt, success]);

  // Handle generate
  const handleGenerate = useCallback(() => {
    // Build params, excluding empty seed
    const generationParams = { ...params };
    if (!generationParams.seed || generationParams.seed.trim() === '') {
      delete generationParams.seed;
    }
    // Filter empty post_processing
    if (!generationParams.post_processing || generationParams.post_processing.length === 0) {
      delete generationParams.post_processing;
    }

    onGenerate?.({
      prompt: previewPrompt,
      negative_prompt: NEGATIVE_PROMPT_TEMPLATE,
      models: options.models,
      params: generationParams
    });
  }, [previewPrompt, options.models, params, onGenerate]);

  // Get models to display
  const displayModels = availableModels?.length > 0
    ? availableModels
    : RECOMMENDED_MODELS.map(name => ({ name, count: 0 }));

  return (
    <BuilderContainer
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
    >
      <BuilderHeader>
        <BuilderTitle>
          <FaPaintBrush aria-hidden="true" />
          Prompt Builder
        </BuilderTitle>
        <HeaderActions>
          <IconBtn onClick={randomize} title="Randomize styles">
            <FaRandom aria-hidden="true" />
          </IconBtn>
          <IconBtn onClick={reset} title="Reset to defaults">
            <FaUndo aria-hidden="true" />
          </IconBtn>
        </HeaderActions>
      </BuilderHeader>

      {/* Main Prompt */}
      <FormGroup>
        <Label htmlFor="custom-prompt">Describe what you want to generate</Label>
        <TextArea
          id="custom-prompt"
          value={options.customPrompt}
          onChange={e => updateOption('customPrompt', e.target.value)}
          placeholder="e.g., a cute anime girl with blue hair, wearing a school uniform, smiling"
        />
      </FormGroup>

      {/* Style Section */}
      <Section>
        <SectionHeader onClick={() => toggleSection('style')}>
          <SectionTitle>
            <FaImage aria-hidden="true" />
            Style Options
          </SectionTitle>
          {expandedSections.style ? <FaChevronUp /> : <FaChevronDown />}
        </SectionHeader>

        <AnimatePresence>
          {expandedSections.style && (
            <SectionContent
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FormGroup>
                <Label>Art Style</Label>
                <PresetGrid>
                  {Object.entries(ART_STYLES).map(([key, style]) => (
                    <PresetButton
                      key={key}
                      $selected={options.artStyle === key}
                      onClick={() => updateOption('artStyle', key)}
                    >
                      {style.label}
                    </PresetButton>
                  ))}
                </PresetGrid>
              </FormGroup>

              <FormGroup>
                <Label>Pose</Label>
                <PresetGrid>
                  {Object.entries(POSE_PRESETS).map(([key, pose]) => (
                    <PresetButton
                      key={key}
                      $selected={options.pose === key}
                      onClick={() => updateOption('pose', key)}
                    >
                      {pose.label}
                    </PresetButton>
                  ))}
                </PresetGrid>
              </FormGroup>

              <FormGroup>
                <Label>Background</Label>
                <PresetGrid>
                  {Object.entries(BACKGROUND_PRESETS).map(([key, bg]) => (
                    <PresetButton
                      key={key}
                      $selected={options.background === key}
                      onClick={() => updateOption('background', key)}
                    >
                      {bg.label}
                    </PresetButton>
                  ))}
                </PresetGrid>
              </FormGroup>
            </SectionContent>
          )}
        </AnimatePresence>
      </Section>

      {/* Advanced Section */}
      <Section>
        <SectionHeader onClick={() => toggleSection('advanced')}>
          <SectionTitle>
            <FaCog aria-hidden="true" />
            Advanced Settings
          </SectionTitle>
          {expandedSections.advanced ? <FaChevronUp /> : <FaChevronDown />}
        </SectionHeader>

        <AnimatePresence>
          {expandedSections.advanced && (
            <SectionContent
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* Model Selection */}
              <SubSection>
                <SubSectionTitle>Model</SubSectionTitle>
                <FormGroup>
                  <Select
                    id="model-select"
                    value={options.models[0] || ''}
                    onChange={e => updateOption('models', [e.target.value])}
                  >
                    <optgroup label="Recommended Models">
                      {RECOMMENDED_MODELS.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                    {displayModels.length > 0 && (
                      <optgroup label="All Available Models">
                        {displayModels
                          .filter(m => !RECOMMENDED_MODELS.includes(m.name))
                          .map(model => (
                            <option key={model.name} value={model.name}>
                              {model.name} ({model.count} workers)
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </Select>
                  <HelpText>
                    Models with more workers generate faster. Recommended models are optimized for anime/character art.
                  </HelpText>
                </FormGroup>
              </SubSection>

              {/* Sampling Settings */}
              <SubSection>
                <SubSectionTitle>Sampling</SubSectionTitle>
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="sampler-select">Sampler</Label>
                    <Select
                      id="sampler-select"
                      value={params.sampler_name}
                      onChange={e => updateParam('sampler_name', e.target.value)}
                    >
                      {SAMPLER_NAMES.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="n-select">Number of Images</Label>
                    <Select
                      id="n-select"
                      value={params.n}
                      onChange={e => updateParam('n', parseInt(e.target.value))}
                    >
                      <option value="1">1 image</option>
                      <option value="2">2 images</option>
                      <option value="3">3 images</option>
                      <option value="4">4 images</option>
                    </Select>
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <RangeGroup>
                    <RangeHeader>
                      <Label>Steps</Label>
                      <RangeValue>{params.steps}</RangeValue>
                    </RangeHeader>
                    <RangeInput
                      type="range"
                      min="10"
                      max="100"
                      value={params.steps}
                      onChange={e => updateParam('steps', parseInt(e.target.value))}
                    />
                    <HelpText>More steps = better quality, longer wait</HelpText>
                  </RangeGroup>

                  <RangeGroup>
                    <RangeHeader>
                      <Label>CFG Scale</Label>
                      <RangeValue>{params.cfg_scale}</RangeValue>
                    </RangeHeader>
                    <RangeInput
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={params.cfg_scale}
                      onChange={e => updateParam('cfg_scale', parseFloat(e.target.value))}
                    />
                    <HelpText>Higher = closer to prompt, lower = more creative</HelpText>
                  </RangeGroup>
                </FormRow>

                <FormRow>
                  <RangeGroup>
                    <RangeHeader>
                      <Label>CLIP Skip</Label>
                      <RangeValue>{params.clip_skip}</RangeValue>
                    </RangeHeader>
                    <RangeInput
                      type="range"
                      min="1"
                      max="12"
                      value={params.clip_skip}
                      onChange={e => updateParam('clip_skip', parseInt(e.target.value))}
                    />
                    <HelpText>2 recommended for anime models</HelpText>
                  </RangeGroup>

                  <FormGroup>
                    <Label htmlFor="seed-input">Seed (optional)</Label>
                    <TextInput
                      id="seed-input"
                      type="text"
                      value={params.seed}
                      onChange={e => updateParam('seed', e.target.value)}
                      placeholder="Random"
                    />
                    <HelpText>Same seed = reproducible results</HelpText>
                  </FormGroup>
                </FormRow>

                <CheckboxGroup>
                  <CheckboxLabel>
                    <input
                      type="checkbox"
                      checked={params.karras}
                      onChange={e => updateParam('karras', e.target.checked)}
                    />
                    Karras Scheduler
                  </CheckboxLabel>
                </CheckboxGroup>
              </SubSection>

              {/* Image Dimensions */}
              <SubSection>
                <SubSectionTitle>Image Size</SubSectionTitle>
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="width-select">Width</Label>
                    <Select
                      id="width-select"
                      value={params.width}
                      onChange={e => updateParam('width', parseInt(e.target.value))}
                    >
                      <option value="384">384px</option>
                      <option value="448">448px</option>
                      <option value="512">512px</option>
                      <option value="576">576px</option>
                      <option value="640">640px</option>
                      <option value="704">704px</option>
                      <option value="768">768px</option>
                      <option value="832">832px</option>
                      <option value="896">896px</option>
                      <option value="960">960px</option>
                      <option value="1024">1024px</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="height-select">Height</Label>
                    <Select
                      id="height-select"
                      value={params.height}
                      onChange={e => updateParam('height', parseInt(e.target.value))}
                    >
                      <option value="384">384px</option>
                      <option value="448">448px</option>
                      <option value="512">512px</option>
                      <option value="576">576px</option>
                      <option value="640">640px</option>
                      <option value="704">704px</option>
                      <option value="768">768px</option>
                      <option value="832">832px</option>
                      <option value="896">896px</option>
                      <option value="960">960px</option>
                      <option value="1024">1024px</option>
                    </Select>
                  </FormGroup>
                </FormRow>
                <HelpText>
                  Portrait: 512x768 | Landscape: 768x512 | Square: 512x512 | Larger = longer wait
                </HelpText>
              </SubSection>

              {/* Post-Processing */}
              <SubSection>
                <SubSectionTitle>Post-Processing (Upscaling & Enhancement)</SubSectionTitle>
                <MultiSelectContainer>
                  <MultiSelectChips>
                    {POST_PROCESSORS.map(processor => (
                      <Chip
                        key={processor}
                        type="button"
                        $selected={(params.post_processing || []).includes(processor)}
                        onClick={() => togglePostProcessor(processor)}
                      >
                        {processor}
                      </Chip>
                    ))}
                  </MultiSelectChips>
                  <HelpText>
                    GFPGAN/CodeFormers: Face enhancement | RealESRGAN: Upscaling | strip_background: Remove background
                  </HelpText>
                </MultiSelectContainer>
              </SubSection>
            </SectionContent>
          )}
        </AnimatePresence>
      </Section>

      {/* Prompt Preview */}
      <PromptPreview>
        <PromptPreviewHeader>
          <PromptPreviewLabel>Final Prompt</PromptPreviewLabel>
          <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
            <CharCount $warning={previewPrompt.length > 500}>
              {previewPrompt.length} chars
            </CharCount>
            <IconBtn onClick={copyPrompt} title="Copy prompt">
              <FaCopy aria-hidden="true" />
            </IconBtn>
          </div>
        </PromptPreviewHeader>
        <PromptText>
          {previewPrompt || <span style={{ color: theme.colors.textSecondary }}>Enter a description above to see the prompt</span>}
        </PromptText>
      </PromptPreview>

      {/* Generate Button */}
      <GenerateButton
        onClick={handleGenerate}
        disabled={isGenerating || !options.customPrompt?.trim()}
        $isGenerating={isGenerating}
      >
        <FaMagic aria-hidden="true" />
        {isGenerating ? 'Generating...' : 'Generate Image'}
      </GenerateButton>
    </BuilderContainer>
  );
};

PromptBuilder.propTypes = {
  /** Handler for generate button */
  onGenerate: PropTypes.func,
  /** Whether generation is in progress */
  isGenerating: PropTypes.bool,
  /** Available models from API */
  availableModels: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    count: PropTypes.number
  }))
};

PromptBuilder.defaultProps = {
  onGenerate: null,
  isGenerating: false,
  availableModels: []
};

export default PromptBuilder;
