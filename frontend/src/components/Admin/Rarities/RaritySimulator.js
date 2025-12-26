/**
 * RaritySimulator - Interactive rate simulator for testing drop rates
 *
 * Helps administrators visualize expected outcomes based on current
 * rarity configurations. Shows expected results across different pool types.
 *
 * Features:
 * - Adjustable pull count
 * - Real-time calculation of expected results
 * - Visual breakdown by pool type
 *
 * Accessibility:
 * - Collapsible with proper ARIA attributes
 * - Input has clear labeling
 * - Results presented in accessible grid
 */
import React from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence } from 'framer-motion';
import { FaDice } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  SimulatorBox,
  SimulatorHeader,
  SimulatorControls,
  SimulatorInput,
  SimulatorContent,
  SimulatorNote,
  SimulatorGrid,
  SimulatorPool,
  SimulatorPoolTitle,
  SimulatorRow,
  SimulatorRarity,
  SimulatorValue,
  SimulatorPercent,
  SimulatorMainRate,
} from './Rarity.styles';

const RaritySimulator = ({
  isVisible,
  pullCount,
  onPullCountChange,
  simulatedResults,
  rarities,
}) => {
  const { t } = useTranslation();

  const poolLabels = {
    standardSingle: t('admin.rarities.poolStandardSingle'),
    standardMulti: t('admin.rarities.poolStandardMulti'),
    bannerSingle: t('admin.rarities.poolBanner'),
    premiumSingle: t('admin.rarities.poolPremium'),
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <SimulatorBox
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          role="region"
          aria-label={t('admin.rarities.rateSimulator')}
        >
          <SimulatorHeader>
            <span>
              <FaDice aria-hidden="true" /> {t('admin.rarities.rateSimulator')}
            </span>
            <SimulatorControls>
              <label htmlFor="simulator-pulls">
                {t('admin.rarities.simulating')}
              </label>
              <SimulatorInput
                id="simulator-pulls"
                type="number"
                value={pullCount}
                onChange={(e) => onPullCountChange(Math.max(1, parseInt(e.target.value) || 100))}
                min="1"
                max="10000"
                aria-describedby="simulator-description"
              />
              <span>{t('admin.rarities.pulls')}</span>
            </SimulatorControls>
          </SimulatorHeader>

          <SimulatorContent>
            <SimulatorNote id="simulator-description">
              {pullCount === 1
                ? t('admin.rarities.simulatorSingleNote')
                : t('admin.rarities.simulatorMultiNote', { count: pullCount })
              }
            </SimulatorNote>

            {simulatedResults && (
              <SimulatorGrid role="list">
                {['standardSingle', 'standardMulti', 'bannerSingle', 'premiumSingle'].map(poolKey => (
                  <SimulatorPool key={poolKey} role="listitem">
                    <SimulatorPoolTitle>
                      {poolLabels[poolKey]}
                    </SimulatorPoolTitle>
                    {rarities.map(r => {
                      const result = simulatedResults[poolKey]?.[r.name];
                      const rate = result?.rate || 0;
                      const count = result?.count || 0;

                      return (
                        <SimulatorRow key={r.name}>
                          <SimulatorRarity $color={r.color}>
                            {r.displayName}
                          </SimulatorRarity>
                          <SimulatorValue>
                            {pullCount === 1 ? (
                              <SimulatorMainRate>{rate.toFixed(1)}%</SimulatorMainRate>
                            ) : (
                              <>
                                ~{count}
                                <SimulatorPercent>({rate.toFixed(1)}%)</SimulatorPercent>
                              </>
                            )}
                          </SimulatorValue>
                        </SimulatorRow>
                      );
                    })}
                  </SimulatorPool>
                ))}
              </SimulatorGrid>
            )}
          </SimulatorContent>
        </SimulatorBox>
      )}
    </AnimatePresence>
  );
};

RaritySimulator.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  pullCount: PropTypes.number.isRequired,
  onPullCountChange: PropTypes.func.isRequired,
  simulatedResults: PropTypes.object,
  rarities: PropTypes.array.isRequired,
};

export default React.memo(RaritySimulator);
