# TapTarget Component Structure

This directory contains the refactored TapTarget component, split into focused, reusable sub-components.

## Component Architecture

### Main Component
- **index.js** - Main TapTarget component that composes all sub-components
  - Manages local click state
  - Coordinates visual effects (pulse rings, screen shake)
  - Handles haptic feedback
  - Passes props to child components
  - Exports as default for backward compatibility

### Sub-Components

#### TapOrb.js
The main clickable orb with visual feedback.
- **Responsibilities:**
  - Styled button with prestige-based visual evolution
  - Click handler with accessibility support
  - Idle breathing animation
  - Critical hit glow effects
  - Golden essence glow effects
  - Click power display label
- **Props:**
  - `prestigeLevel` - Current prestige level (0-5+)
  - `isCrit` - Whether last click was critical
  - `isGolden` - Whether last click was golden
  - `productionRate` - Normalized rate (0-3) for animation speed
  - `clickPower` - Current click power value
  - `onClick` - Click handler function
  - `buttonRef` - Ref to button element

#### ParticleCanvas.js
PIXI.js-based particle effects system.
- **Responsibilities:**
  - PIXI.js application initialization
  - Particle system management
  - Click particle spawning (normal/crit/golden)
  - Particle animation loop
  - Cleanup on unmount
- **Props:**
  - `onReady` - Callback with spawnParticles function
- **Particle System:**
  - Normal: 15 purple particles
  - Crit: 22 yellow particles
  - Golden: 30 gold particles with extra glow

#### ComboIndicator.js
Visual combo multiplier display.
- **Responsibilities:**
  - Current combo multiplier display
  - Visual tier changes (lightning → sparkles)
  - Color coding by combo level
  - Smooth enter/exit animations
- **Props:**
  - `comboMultiplier` - Current combo value (e.g., 1.5)
- **Visual Tiers:**
  - 1.05-1.2x: Purple with lightning icon
  - 1.2-1.5x: Brighter purple
  - 1.5x+: Gold with sparkles icon

#### EssenceDisplay.js
Floating numbers showing essence gained.
- **Responsibilities:**
  - Display floating "+X essence" numbers
  - Different styles for normal/crit/golden
  - Position and fade animations
  - AnimatePresence for multiple numbers
- **Props:**
  - `floatingNumbers` - Array of {id, x, y, value, isCrit, isGolden}
- **Styling:**
  - Normal: 22px purple text
  - Crit: 28px yellow with "CRIT!" label
  - Golden: 36px gold with "GOLDEN!" label

## Usage

The component maintains the same API as the original TapTarget:

```javascript
import { TapTarget } from '../components/EssenceTap';

<TapTarget
  onClick={handleClick}
  clickPower={100}
  lastClickResult={{ essenceGained: 150, isCrit: true, isGolden: false }}
  comboMultiplier={1.3}
  prestigeLevel={2}
  productionRate={1000}
/>
```

## Benefits of Refactoring

1. **Modularity** - Each component has a single, clear responsibility
2. **Testability** - Components can be tested independently
3. **Reusability** - Sub-components can be used elsewhere if needed
4. **Maintainability** - Easier to locate and fix bugs
5. **Performance** - React.memo on each component for optimization
6. **Readability** - Reduced file size, clearer code structure

## File Size Comparison

- Original TapTarget.js: ~600 lines
- New Structure:
  - index.js: ~240 lines (orchestration)
  - TapOrb.js: ~180 lines (orb rendering)
  - ParticleCanvas.js: ~170 lines (particle system)
  - ComboIndicator.js: ~80 lines (combo display)
  - EssenceDisplay.js: ~70 lines (floating numbers)
  - Total: ~740 lines (including documentation)

## Migration Notes

- The old `TapTarget.js` file can be removed once testing is complete
- All imports from `@/components/EssenceTap` continue to work
- No breaking changes to the component API
- All features from original component preserved
