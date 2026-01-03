# Decomposed Hooks - Quick Start

## Import

```javascript
import {
  useComboMultiplier,
  usePassiveIncome,
  useAchievements,
  useAutoSave
} from '@/hooks/essenceTap';
```

## Usage

### 1. Combo Multiplier

```javascript
const { comboMultiplier, incrementCombo, resetCombo } = useComboMultiplier();

// On click
incrementCombo();

// On prestige
resetCombo();

// Display
<div>Combo: {comboMultiplier.toFixed(1)}x</div>
```

### 2. Passive Income

```javascript
const isWaitingForSyncRef = useRef(false);
const { pendingEssence, clearPending } = usePassiveIncome(
  gameState?.productionPerSecond || 0,
  isWaitingForSyncRef
);

// After save
clearPending();

// Display
<div>Pending: {formatNumber(pendingEssence)}</div>
```

### 3. Achievements

```javascript
const {
  unlockedAchievement,
  checkAchievements,
  dismissAchievement,
  initializeTracking
} = useAchievements(sounds.playMilestone);

// On game load
useEffect(() => {
  initializeTracking(gameState);
}, [gameState]);

// On click/event
checkAchievements({
  totalClicks: newTotalClicks,
  totalGolden: newTotalGolden,
  maxCombo: newMaxCombo
});

// Display
{unlockedAchievement && (
  <AchievementToast
    achievement={unlockedAchievement}
    onDismiss={dismissAchievement}
  />
)}
```

### 4. Auto-Save

```javascript
const { lastSaveTime } = useAutoSave(
  30000, // Save every 30 seconds
  () => pendingEssenceRef.current,
  async (pendingEssence) => {
    await api.post('/essence-tap/save', { ... });
    clearPending();
  }
);

// Display last save time
<div>Last saved: {new Date(lastSaveTime).toLocaleTimeString()}</div>
```

## Full Example

```javascript
const EssenceTapGame = () => {
  const [gameState, setGameState] = useState(null);
  const isWaitingForSyncRef = useRef(false);

  // Decomposed hooks
  const { comboMultiplier, incrementCombo } = useComboMultiplier();
  const { pendingEssence, clearPending, pendingEssenceRef } = usePassiveIncome(
    gameState?.productionPerSecond || 0,
    isWaitingForSyncRef
  );
  const { checkAchievements, initializeTracking } = useAchievements();
  const { lastSaveTime } = useAutoSave(30000, () => pendingEssenceRef.current, handleSave);

  // Initialize achievements on load
  useEffect(() => {
    if (gameState) initializeTracking(gameState);
  }, [gameState]);

  const handleClick = () => {
    incrementCombo();
    // ... calculate essence ...
    checkAchievements({ totalClicks: newTotal });
  };

  async function handleSave() {
    await api.post('/essence-tap/save', { ... });
    clearPending();
  }

  return <div>{/* game UI */}</div>;
};
```

## Benefits

- **Testable**: Each hook can be tested independently
- **Reusable**: Use only what you need
- **Clear**: Single responsibility per hook
- **Performant**: Only re-render on specific state changes

## Documentation

See `DECOMPOSED_HOOKS_GUIDE.md` for detailed documentation and examples.
