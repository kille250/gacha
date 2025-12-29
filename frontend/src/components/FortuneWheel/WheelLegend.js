/**
 * WheelLegend Component
 *
 * Displays a readable legend of wheel prizes below the wheel.
 * Uses icons and colors to match wheel segments.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import {
  IconPoints,
  IconPoolPremium,
  IconTicket,
  IconPremiumTicket,
  IconBoost,
  IconStar,
  IconDice
} from '../../constants/icons';
import {
  LegendContainer,
  LegendItem,
  LegendColorDot,
  LegendIcon,
  LegendLabel
} from './FortuneWheel.styles';

/**
 * Get icon component for segment type
 */
const getSegmentIcon = (iconType) => {
  switch (iconType) {
    case 'points':
      return <IconPoints size={14} />;
    case 'pointsHigh':
      return <IconPoolPremium size={14} />;
    case 'ticket':
      return <IconTicket size={14} />;
    case 'premium':
      return <IconPremiumTicket size={14} />;
    case 'boost':
      return <IconBoost size={14} />;
    case 'jackpot':
      return <IconStar size={14} color="#FFD700" />;
    case 'retry':
      return <IconDice size={14} />;
    default:
      return <IconPoints size={14} />;
  }
};

/**
 * Get human-readable label for segment
 */
const getReadableLabel = (segment, t) => {
  const { type, value, label } = segment;

  switch (type) {
    case 'points':
    case 'jackpot':
      return t('fortuneWheel.legend.points', '{{value}} Points', { value });
    case 'tickets':
      return t('fortuneWheel.legend.tickets', '{{value}} Ticket', { value, count: value });
    case 'premium':
      return t('fortuneWheel.legend.premium', '{{value}} Premium', { value, count: value });
    case 'multiplier':
      return t('fortuneWheel.legend.xpBoost', '2x XP');
    case 'nothing':
      return t('fortuneWheel.legend.retry', 'Retry');
    default:
      return label;
  }
};

const WheelLegend = ({ segments = [], highlightedId = null }) => {
  const { t } = useTranslation();

  if (!segments.length) return null;

  return (
    <LegendContainer>
      {segments.map((segment) => (
        <LegendItem
          key={segment.id}
          $highlighted={highlightedId === segment.id}
          title={getReadableLabel(segment, t)}
        >
          <LegendColorDot $color={segment.color} />
          <LegendIcon>
            {getSegmentIcon(segment.iconType)}
          </LegendIcon>
          <LegendLabel>
            {getReadableLabel(segment, t)}
          </LegendLabel>
        </LegendItem>
      ))}
    </LegendContainer>
  );
};

WheelLegend.propTypes = {
  segments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    iconType: PropTypes.string,
    type: PropTypes.string.isRequired,
    value: PropTypes.number
  })).isRequired,
  highlightedId: PropTypes.string
};

export default WheelLegend;
