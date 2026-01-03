/**
 * ComboIndicator - Displays current combo multiplier
 *
 * Features:
 * - Current combo count display
 * - Combo multiplier value
 * - Visual tier changes (normal -> fire -> sparkles)
 * - Smooth animation on combo changes
 * - AnimatePresence for enter/exit
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../../design-system';
import { IconSparkles, IconLightning } from '../../../constants/icons';

const ComboWrapper = styled(motion.div)`
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: ${theme.radius.full};
  border: 1px solid ${props =>
    props.$combo > 1.5 ? 'rgba(255, 193, 7, 0.5)' :
    props.$combo > 1.2 ? 'rgba(168, 85, 247, 0.5)' :
    'rgba(255, 255, 255, 0.2)'};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.bold};
  color: ${props =>
    props.$combo > 1.5 ? '#FFC107' :
    props.$combo > 1.2 ? '#A855F7' :
    'white'};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const ComboIcon = styled.span`
  font-size: 18px;
  display: flex;
  align-items: center;
`;

/**
 * ComboIndicator Component
 *
 * @param {number} comboMultiplier - Current combo multiplier (e.g., 1.5 for 1.5x)
 */
const ComboIndicator = memo(({ comboMultiplier = 1 }) => {
  // Only show if combo is above threshold
  if (comboMultiplier <= 1.05) {
    return null;
  }

  return (
    <AnimatePresence>
      <ComboWrapper
        $combo={comboMultiplier}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <ComboIcon>
          {comboMultiplier > 1.5 ? (
            <IconSparkles size={18} />
          ) : (
            <IconLightning size={18} />
          )}
        </ComboIcon>
        Combo x{comboMultiplier.toFixed(1)}
      </ComboWrapper>
    </AnimatePresence>
  );
});

ComboIndicator.displayName = 'ComboIndicator';

export default ComboIndicator;
