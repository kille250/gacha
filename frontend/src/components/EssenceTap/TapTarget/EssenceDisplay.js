/**
 * EssenceDisplay - Floating essence numbers on click
 *
 * Features:
 * - Displays floating numbers showing essence gained
 * - Different styles for normal/crit/golden clicks
 * - Smooth position and fade animations
 * - AnimatePresence for managing multiple numbers
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../../design-system';
import { IconStar, IconFlame } from '../../../constants/icons';
import { formatNumber } from '../../../hooks/useEssenceTap';

const FloatingNumber = styled(motion.div)`
  position: absolute;
  font-size: ${props => props.$isGolden ? '36px' : props.$isCrit ? '28px' : '22px'};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$isGolden ? '#FFD700' : props.$isCrit ? '#FFC107' : '#C084FC'};
  text-shadow: ${props =>
    props.$isGolden ? '0 0 30px rgba(255, 215, 0, 0.9), 0 2px 4px rgba(0,0,0,0.5)' :
    props.$isCrit ? '0 0 20px rgba(255, 193, 7, 0.7), 0 2px 4px rgba(0,0,0,0.5)' :
    '0 0 15px rgba(192, 132, 252, 0.5), 0 2px 4px rgba(0,0,0,0.3)'};
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
`;

/**
 * EssenceDisplay Component
 *
 * @param {Array} floatingNumbers - Array of floating number objects with id, x, y, value, isCrit, isGolden
 */
const EssenceDisplay = memo(({ floatingNumbers = [] }) => {
  return (
    <AnimatePresence>
      {floatingNumbers.map(num => (
        <FloatingNumber
          key={num.id}
          $isCrit={num.isCrit}
          $isGolden={num.isGolden}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -120, scale: 1.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            left: num.x - 50,
            top: num.y - 20
          }}
        >
          +{formatNumber(num.value)}
          {num.isGolden && <> <IconStar size={14} /> GOLDEN!</>}
          {num.isCrit && !num.isGolden && <> <IconFlame size={14} /> CRIT!</>}
        </FloatingNumber>
      ))}
    </AnimatePresence>
  );
});

EssenceDisplay.displayName = 'EssenceDisplay';

export default EssenceDisplay;
