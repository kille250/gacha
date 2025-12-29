/**
 * FortuneWheel Component
 *
 * The main wheel component with SVG segments and spinning animation.
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { IconDice, IconStar } from '../../constants/icons';
import {
  WheelContainer,
  WheelOuter,
  WheelInner,
  WheelSvg,
  WheelCenter,
  WheelCenterIcon,
  Pointer,
  PointerTriangle
} from './FortuneWheel.styles';

/**
 * Convert polar to cartesian coordinates
 */
const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
};

/**
 * Create SVG arc path for a wheel segment
 */
const describeArc = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
};

/**
 * Calculate text position for segment label
 */
const getTextPosition = (cx, cy, radius, startAngle, endAngle) => {
  const midAngle = (startAngle + endAngle) / 2;
  const textRadius = radius * 0.65;
  return polarToCartesian(cx, cy, textRadius, midAngle);
};

const FortuneWheel = ({
  segments = [],
  rotation = 0,
  spinning = false,
  spinDuration = 4000
}) => {
  const segmentAngle = 360 / segments.length;
  const cx = 150; // Center X
  const cy = 150; // Center Y
  const radius = 145; // Wheel radius

  // Memoize segment paths to avoid recalculation
  const segmentPaths = useMemo(() => {
    return segments.map((segment, index) => {
      const startAngle = index * segmentAngle;
      const endAngle = (index + 1) * segmentAngle;
      const path = describeArc(cx, cy, radius, startAngle, endAngle);
      const textPos = getTextPosition(cx, cy, radius, startAngle, endAngle);
      const textRotation = startAngle + segmentAngle / 2;

      return {
        ...segment,
        path,
        textPos,
        textRotation
      };
    });
  }, [segments, segmentAngle, cx, cy, radius]);

  return (
    <WheelContainer>
      {/* Pointer at top */}
      <Pointer>
        <PointerTriangle $spinning={spinning} />
      </Pointer>

      {/* Outer ring (gold border) */}
      <WheelOuter $spinning={spinning} />

      {/* Inner wheel with segments */}
      <WheelInner>
        <WheelSvg
          viewBox="0 0 300 300"
          $rotation={rotation}
          $duration={spinning ? spinDuration : 0}
        >
          {/* Draw segments */}
          {segmentPaths.map((segment, index) => (
            <g key={segment.id || index}>
              {/* Segment slice */}
              <path
                d={segment.path}
                fill={segment.color}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />

              {/* Segment icon */}
              <text
                x={segment.textPos.x}
                y={segment.textPos.y - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20"
                transform={`rotate(${segment.textRotation}, ${segment.textPos.x}, ${segment.textPos.y - 8})`}
              >
                {segment.icon}
              </text>

              {/* Segment label */}
              <text
                x={segment.textPos.x}
                y={segment.textPos.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="bold"
                fill="white"
                transform={`rotate(${segment.textRotation}, ${segment.textPos.x}, ${segment.textPos.y + 12})`}
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  paintOrder: 'stroke fill',
                  stroke: 'rgba(0,0,0,0.3)',
                  strokeWidth: '2px'
                }}
              >
                {segment.label}
              </text>
            </g>
          ))}
        </WheelSvg>
      </WheelInner>

      {/* Center button decoration */}
      <WheelCenter>
        <WheelCenterIcon>
          {spinning ? <IconDice /> : <IconStar />}
        </WheelCenterIcon>
      </WheelCenter>
    </WheelContainer>
  );
};

FortuneWheel.propTypes = {
  segments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.string
  })).isRequired,
  rotation: PropTypes.number,
  spinning: PropTypes.bool,
  spinDuration: PropTypes.number
};

export default FortuneWheel;
