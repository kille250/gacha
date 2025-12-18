import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from './theme';
import { shimmer } from './animations';

// ==================== ROLL BUTTONS ====================

export const RollButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-bottom: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: center;
    gap: ${theme.spacing.sm};
  }
`;

export const RollButton = styled(motion.button)`
  background: ${theme.gradient.purple};
  color: white;
  border: none;
  border-radius: ${theme.radius.full};
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(110, 72, 170, 0.4);
  
  /* Shine effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.25),
      transparent
    );
    transition: left 0.5s ease;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:disabled {
    background: linear-gradient(135deg, #4a5568, #2d3748);
    cursor: not-allowed;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 85%;
    max-width: 300px;
    padding: 12px 24px;
  }
`;

export const MultiRollButton = styled(RollButton)`
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' 
    : theme.gradient.blue};
  box-shadow: 0 4px 20px rgba(75, 108, 183, 0.4);
`;

export const CostLabel = styled.span`
  font-size: 13px;
  opacity: 0.85;
  font-weight: 500;
`;

export const RollHint = styled.p`
  text-align: center;
  color: ${theme.text.secondary};
  font-size: 14px;
  margin: ${theme.spacing.sm} 0 0;
  
  strong {
    color: ${theme.text.primary};
  }
`;

