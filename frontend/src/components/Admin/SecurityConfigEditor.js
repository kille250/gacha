/**
 * SecurityConfigEditor.js
 * 
 * Modal for editing security configuration settings.
 * Includes validation and confirmation before saving.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { 
  FaCog, FaSave, FaUndo, FaExclamationTriangle 
} from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { getSecurityConfig, updateSecurityConfig } from '../../utils/api';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  Input,
  PrimaryButton,
  SecondaryButton,
} from './AdminStyles';

const CATEGORY_LABELS = {
  risk_thresholds: 'Risk Scoring',
  rate_limits: 'Rate Limits',
  captcha: 'CAPTCHA Settings',
  policies: 'Policy Settings',
  enforcement: 'Enforcement Penalties'
};

const SecurityConfigEditor = ({ show, onClose, onSuccess }) => {
  const [config, setConfig] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('risk_thresholds');
  
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSecurityConfig();
      setConfig(data);
      // Initialize edited values with current values
      const initial = {};
      if (data.config) {
        Object.values(data.config).flat().forEach(item => {
          initial[item.key] = item.rawValue || String(item.value);
        });
      }
      setEditedValues(initial);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (show) {
      fetchConfig();
    }
  }, [show, fetchConfig]);
  
  const handleValueChange = (key, value) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };
  
  const getChangedValues = () => {
    const changes = {};
    if (!config?.config) return changes;
    
    Object.values(config.config).flat().forEach(item => {
      const originalValue = item.rawValue || String(item.value);
      const editedValue = editedValues[item.key];
      
      if (editedValue !== originalValue) {
        changes[item.key] = editedValue;
      }
    });
    
    return changes;
  };
  
  const hasChanges = Object.keys(getChangedValues()).length > 0;
  
  const handleSave = async () => {
    const changes = getChangedValues();
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    
    setSaving(true);
    try {
      // Convert string values to appropriate types
      const typedChanges = {};
      for (const [key, value] of Object.entries(changes)) {
        if (value === 'true') typedChanges[key] = true;
        else if (value === 'false') typedChanges[key] = false;
        else if (!isNaN(value) && value.trim() !== '') typedChanges[key] = parseFloat(value);
        else typedChanges[key] = value;
      }
      
      await updateSecurityConfig(typedChanges);
      if (onSuccess) onSuccess('Security configuration updated successfully');
      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    if (!config?.config) return;
    const initial = {};
    Object.values(config.config).flat().forEach(item => {
      initial[item.key] = item.rawValue || String(item.value);
    });
    setEditedValues(initial);
  };
  
  const formatKeyName = (key) => {
    return key
      .replace(/^(RISK_THRESHOLD_|RATE_LIMIT_|CAPTCHA_|POLICY_|SHADOWBAN_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getInputType = (key) => {
    if (key.includes('MULTIPLIER') || key.includes('PERCENTAGE')) return 'number';
    if (key.includes('THRESHOLD') || key.includes('MAX') || key.includes('WINDOW') || key.includes('HOURS')) return 'number';
    return 'text';
  };
  
  const getInputStep = (key) => {
    if (key.includes('MULTIPLIER') || key.includes('PERCENTAGE')) return '0.01';
    return '1';
  };
  
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <ModalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => { if (e.target === e.currentTarget && !showConfirm) onClose(); }}
      >
        <ModalContent
          $maxWidth="800px"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <ModalHeader>
            <ModalTitle>
              <FaCog /> Edit Security Configuration
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          
          {!showConfirm ? (
            <>
              <CategoryTabs>
                {config?.config && Object.keys(config.config).map(category => (
                  <CategoryTab
                    key={category}
                    $active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  >
                    {CATEGORY_LABELS[category] || category}
                  </CategoryTab>
                ))}
              </CategoryTabs>
              
              <ModalBody>
                {loading ? (
                  <LoadingText>Loading configuration...</LoadingText>
                ) : (
                  <ConfigForm>
                    {config?.config?.[activeCategory]?.map(item => (
                      <FormGroup key={item.key}>
                        <Label>{formatKeyName(item.key)}</Label>
                        <Input
                          type={getInputType(item.key)}
                          step={getInputStep(item.key)}
                          value={editedValues[item.key] || ''}
                          onChange={(e) => handleValueChange(item.key, e.target.value)}
                        />
                        {item.description && (
                          <HelpText>{item.description}</HelpText>
                        )}
                      </FormGroup>
                    ))}
                  </ConfigForm>
                )}
              </ModalBody>
              
              <ModalFooter>
                <SecondaryButton onClick={handleReset} disabled={!hasChanges}>
                  <FaUndo /> Reset
                </SecondaryButton>
                <PrimaryButton 
                  onClick={() => setShowConfirm(true)} 
                  disabled={!hasChanges || saving}
                >
                  <FaSave /> Save Changes
                </PrimaryButton>
              </ModalFooter>
            </>
          ) : (
            <ConfirmPanel>
              <WarningIcon>
                <FaExclamationTriangle />
              </WarningIcon>
              <ConfirmTitle>Confirm Configuration Changes</ConfirmTitle>
              <ConfirmText>
                You are about to modify security settings. These changes will take effect immediately and may affect user experience.
              </ConfirmText>
              
              <ChangesList>
                <ChangesTitle>Changes to be applied:</ChangesTitle>
                {Object.entries(getChangedValues()).map(([key, value]) => (
                  <ChangeItem key={key}>
                    <span>{formatKeyName(key)}</span>
                    <span>→ {String(value)}</span>
                  </ChangeItem>
                ))}
              </ChangesList>
              
              <ConfirmButtons>
                <SecondaryButton onClick={() => setShowConfirm(false)}>
                  Cancel
                </SecondaryButton>
                <DangerButton onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </DangerButton>
              </ConfirmButtons>
            </ConfirmPanel>
          )}
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};

const CategoryTabs = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  padding: 0 ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  overflow-x: auto;
`;

const CategoryTab = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.text};
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const ConfigForm = styled.div`
  display: grid;
  gap: ${theme.spacing.md};
  max-height: 400px;
  overflow-y: auto;
`;

const HelpText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const ConfirmPanel = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const WarningIcon = styled.div`
  font-size: 48px;
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.lg};
`;

const ConfirmTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const ConfirmText = styled.p`
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
`;

const ChangesList = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  text-align: left;
`;

const ChangesTitle = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text};
`;

const ChangeItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  font-size: ${theme.fontSizes.sm};
  
  &:last-child {
    border-bottom: none;
  }
  
  span:first-child {
    color: ${theme.colors.textSecondary};
  }
  
  span:last-child {
    color: ${theme.colors.primary};
    font-weight: ${theme.fontWeights.bold};
  }
`;

const ConfirmButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const DangerButton = styled(PrimaryButton)`
  background: ${theme.colors.error};
  
  &:hover:not(:disabled) {
    background: #e0342a;
  }
`;

export default SecurityConfigEditor;

