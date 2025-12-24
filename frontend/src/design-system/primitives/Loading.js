/**
 * Loading Components
 *
 * Various loading indicators and spinners.
 */

import styled from 'styled-components';
import { theme, spin, pulse } from '../tokens';

export const LoadingSpinner = styled.div`
  width: ${props => props.$size || '20px'};
  height: ${props => props.$size || '20px'};
  border: 2px solid ${props => props.$color ? `${props.$color}30` : 'rgba(255, 255, 255, 0.3)'};
  border-top-color: ${props => props.$color || 'white'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const LoadingDots = styled.div`
  display: flex;
  gap: 6px;

  span {
    width: 8px;
    height: 8px;
    background: ${theme.colors.primary};
    border-radius: 50%;
    animation: ${pulse} 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0; }
  }
`;
