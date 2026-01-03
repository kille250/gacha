# TapTarget Architecture

## Component Hierarchy

```
TapTarget (index.js)
├── State Management
│   ├── floatingNumbers[]
│   ├── pulseRings[]
│   ├── showGoldenBurst
│   └── shakeScreen
│
├── Event Handlers
│   ├── handleClick()
│   ├── handleParticleReady()
│   └── triggerHaptic()
│
└── Child Components
    ├── ParticleCanvas
    │   └── PIXI.js Application
    │       ├── Graphics rendering
    │       ├── Particle system
    │       └── Animation loop
    │
    ├── PulseRing (multiple instances)
    │   └── Click feedback rings
    │
    ├── GoldenBurstRing (conditional)
    │   └── Golden essence burst effect
    │
    ├── ComboIndicator
    │   ├── Combo multiplier display
    │   ├── Icon (Lightning/Sparkles)
    │   └── AnimatePresence wrapper
    │
    ├── TapOrb
    │   ├── Clickable button
    │   ├── Icon (Gem/Sparkles)
    │   ├── Prestige styling
    │   ├── Animations (breathe/glow/crit/golden)
    │   ├── "TAP TO EARN" label
    │   └── Click power label
    │
    └── EssenceDisplay
        └── Floating numbers (multiple)
            ├── Position animation
            ├── Fade animation
            └── Critical/Golden labels
```

## Data Flow

### Props In (from parent)
```
onClick          → TapTarget → handleClick() → TapOrb
clickPower       → TapTarget → TapOrb
lastClickResult  → TapTarget → {isCrit, isGolden} → TapOrb, EssenceDisplay
comboMultiplier  → TapTarget → ComboIndicator
prestigeLevel    → TapTarget → TapOrb
productionRate   → TapTarget → TapOrb (normalized)
```

### Internal State Flow
```
User Click
    ↓
handleClick()
    ├── onClick() callback to parent
    ├── Calculate click position
    ├── Trigger haptic feedback
    ├── Set visual effects (shake, burst)
    ├── Create pulse rings
    ├── Spawn particles (via spawnParticlesRef)
    └── Add floating number
        ↓
    setTimeout cleanups
```

### Effect Coordination
```
Normal Click:
  - Light haptic
  - Purple pulse ring (400ms)
  - 15 purple particles
  - Purple floating number

Critical Click:
  - Medium haptic
  - Screen shake (200ms)
  - Yellow pulse ring (400ms)
  - 22 yellow particles
  - Larger yellow floating number + "CRIT!"

Golden Click:
  - Heavy haptic (pattern)
  - Screen shake (300ms)
  - Golden burst ring (500ms)
  - 30 gold particles with glow
  - Largest gold floating number + "GOLDEN!"
```

## Performance Optimizations

1. **React.memo** - All sub-components wrapped
   - Prevents re-renders when props don't change
   - Especially important for ParticleCanvas

2. **Ref-based callbacks** - Particle spawn function
   - Avoids prop drilling
   - Stable reference across renders

3. **useCallback** - Event handlers
   - Stable function references
   - Prevents child re-renders

4. **Automatic cleanup** - setTimeout for effects
   - Pulse rings removed after animation
   - Floating numbers removed after duration
   - PIXI.js destroyed on unmount

5. **PIXI.js optimizations**
   - Single Graphics object reused
   - Particle pooling via array filter
   - RequestAnimationFrame via ticker

## File Responsibilities

| File | Lines | Responsibility | External Dependencies |
|------|-------|----------------|----------------------|
| index.js | 240 | Orchestration, state, effects | styled-components, framer-motion |
| TapOrb.js | 180 | Orb rendering, click handling | styled-components, framer-motion, animations.js |
| ParticleCanvas.js | 170 | Particle system, PIXI.js | pixi.js |
| ComboIndicator.js | 80 | Combo display | styled-components, framer-motion |
| EssenceDisplay.js | 70 | Floating numbers | styled-components, framer-motion |

## Testing Strategy

### Unit Tests
- **TapOrb**: Click events, prestige styling, accessibility
- **ParticleCanvas**: Initialization, cleanup, particle spawning
- **ComboIndicator**: Visibility thresholds, tier changes
- **EssenceDisplay**: Number formatting, animations

### Integration Tests
- **TapTarget**: Click → visual effects coordination
- **TapTarget**: Props → child component rendering
- **TapTarget**: State cleanup and memory leaks

### Visual Tests
- **TapOrb**: Prestige levels 0-5+ visual evolution
- **ParticleCanvas**: Particle count and colors
- **ComboIndicator**: Icon and color changes
- **EssenceDisplay**: Position and animation smoothness

## Future Enhancements

1. **TapOrb**: Configurable prestige themes
2. **ParticleCanvas**: WebGL renderer option for performance
3. **ComboIndicator**: Combo decay timer visualization
4. **EssenceDisplay**: Damage number batching for high CPS
5. **TapTarget**: Sound effect integration hooks
