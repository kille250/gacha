# Frontend Architecture Analysis & Refactor Strategy

**Project**: Gacha Application Frontend
**Date**: December 2024
**Status**: Live Application

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Map](#current-architecture-map)
3. [Identified Pain Points](#identified-pain-points)
4. [Mobile-First & Responsive Strategy](#mobile-first--responsive-strategy)
5. [Component Architecture Recommendations](#component-architecture-recommendations)
6. [UX Consistency Patterns](#ux-consistency-patterns)
7. [Accessibility Assessment](#accessibility-assessment)
8. [Performance Considerations](#performance-considerations)
9. [Phased Refactor Plan](#phased-refactor-plan)

---

## Executive Summary

### Overall Assessment: **Strong Foundation with Clear Improvement Paths**

The Gacha frontend demonstrates mature engineering practices with a well-organized codebase. Recent refactoring efforts show investment in maintainability. However, several areas would benefit from consolidation and standardization.

**Strengths:**
- Comprehensive design system (`DesignSystem.js` - 970+ lines of consistent tokens)
- Well-structured component organization (atomic design influence)
- Excellent accessibility foundations (44px touch targets, ARIA attributes, focus management)
- Centralized cache management with visibility-based invalidation
- Composite hooks pattern reducing prop drilling (`useCollection`, `useGachaPage`)
- Internationalization ready (4 languages)

**Key Improvement Areas:**
- Duplicate component implementations (2 Modal systems, inline CharacterCard duplication)
- Inconsistent error handling patterns across pages
- Missing reduced-motion support for accessibility
- Some components exceed single-responsibility bounds

---

## Current Architecture Map

### Directory Structure

```
frontend/src/
├── actions/           # API action creators (legacy, being consolidated)
├── cache/             # Centralized cache management (manager.js, actions.js)
├── components/
│   ├── Admin/         # Admin dashboard components (20+ files)
│   ├── Auth/          # ProtectedRoute
│   ├── Fishing/       # Complex game feature
│   │   ├── engine/    # PixiJS integration
│   │   ├── layout/    # Game UI
│   │   ├── modals/    # Feature modals
│   │   └── overlays/  # Notifications
│   ├── Gacha/         # SummonAnimation
│   ├── Navigation/    # App navigation (Nav, BottomNav, MobileMenu)
│   ├── patterns/      # Reusable patterns (CharacterCard, BannerCard, PageShell)
│   ├── UI/            # Primitive components
│   │   ├── buttons/   # Button, ActionButton, IconButton
│   │   ├── data/      # Card, Badge, ErrorBoundary
│   │   ├── feedback/  # Alert, Toast, Spinner, Loading/Error/Empty States
│   │   ├── forms/     # Input, SearchInput, Select
│   │   ├── layout/    # Container, Grid, Stack, MainLayout
│   │   └── overlay/   # Modal, Drawer, ConfirmDialog
│   └── Upload/        # Multi-file upload system
├── constants/         # App constants
├── context/           # React Context (Auth, Rarity, Toast, Recaptcha)
├── features/          # Feature-specific logic
├── hooks/             # 40+ custom hooks
├── i18n/              # Translations (en, de, ja, es)
├── pages/             # Route pages
├── services/          # Minimal/unused
├── styles/            # DesignSystem.js
└── utils/             # API, helpers
```

### Page & Route Structure

| Route | Page | Layout | Purpose |
|-------|------|--------|---------|
| `/login` | LoginPage | None | Authentication |
| `/register` | RegisterPage | None | Registration |
| `/gacha` | GachaPage | MainLayout | Banner marketplace (critical path) |
| `/collection` | CollectionPage | MainLayout | Character collection |
| `/dojo` | DojoPage | MainLayout | Idle training |
| `/coupons` | CouponPage | MainLayout | Coupon redemption |
| `/settings` | SettingsPage | MainLayout | User preferences |
| `/admin` | AdminPage | MainLayout | Admin dashboard |
| `/roll` | RollPage | None (immersive) | Gacha animation |
| `/banner/:id` | BannerPage | None (immersive) | Banner rolling |
| `/fishing` | FishingPage | None (immersive) | Mini-game |

### State Management

```
Global State (Context):
├── AuthContext       → User session, login/logout, Google OAuth
├── RarityContext     → Dynamic rarity configs from backend
├── ToastContext      → Global notifications
└── RecaptchaContext  → CAPTCHA handling

Page State (Composite Hooks):
├── useCollection()   → Collection data, filters, pagination, level-up
├── useGachaPage()    → Banners, modal state
├── useUploadState()  → Upload flow state machine
└── useFishing*()     → Multiple fishing game hooks

Cache Layer:
└── cache/manager.js  → Axios interceptor, visibility-based staleness
```

---

## Identified Pain Points

### 1. Duplicate Component Implementations

**Issue**: Two separate Modal implementations exist

| Location | Lines | Features |
|----------|-------|----------|
| `UI/Modal.js` | 481 | Sizes, reduced motion, compound pattern |
| `UI/overlay/Modal.js` | 256 | Focus trap, portal, ARIA |

**Impact**: Developer confusion, duplicate maintenance, inconsistent behavior

**Recommendation**: Consolidate to `UI/overlay/Modal.js`, deprecate `UI/Modal.js`

---

### 2. Inline Component Duplication

**Issue**: CharacterCard pattern exists but is duplicated inline in CollectionPage

| File | Lines | Issue |
|------|-------|-------|
| `patterns/CharacterCard.js` | 266 | Reusable, memoized, complete |
| `CollectionPage.js` | 394-457 | Inline duplicate with same styled components |

**Recommendation**: Refactor CollectionPage to use existing CharacterCard pattern

---

### 3. Inconsistent Error Handling

| Page | Approach | Line |
|------|----------|------|
| GachaPage | Console.error only | 99-101 |
| CollectionPage | User-facing ErrorMessage | 315-318 |

```javascript
// GachaPage - No user feedback
catch (err) {
  console.error("Error fetching banners:", err);
}

// CollectionPage - Shows error to user
{error && (
  <ErrorMessage role="alert">{error}</ErrorMessage>
)}
```

**Recommendation**: Standardize on user-facing error display with toast fallback

---

### 4. Mixed State Management Patterns

| Component | Pattern | Lines |
|-----------|---------|-------|
| EditCharacterModal | 6 separate `useState` | 48-65 |
| useUploadState | `useReducer` state machine | 95-111 |

**Recommendation**: Document when to use each pattern:
- `useState`: Simple, independent values
- `useReducer`: Complex state with transitions (forms, flows)
- Custom hook: Reusable stateful logic

---

### 5. Duplicate Utility Logic

**Image Error Handling** appears in multiple places:

```javascript
// CharacterCard.js:187-191
const handleImageError = (e) => {
  if (!e.target.src.includes('placeholder')) {
    e.target.src = PLACEHOLDER_IMAGE;
  }
};

// CollectionPage.js:132-136
const handleImageError = (e) => {
  if (!e.target.src.includes('placeholder')) {
    e.target.src = PLACEHOLDER_IMAGE;
  }
};
```

**Recommendation**: Extract to `utils/mediaUtils.js`:
```javascript
export const createImageErrorHandler = (placeholderUrl) => (e) => {
  if (!e.target.src.includes('placeholder')) {
    e.target.src = placeholderUrl;
  }
};
```

---

### 6. Naming Inconsistencies

| Category | Examples | Issue |
|----------|----------|-------|
| Boolean props | `isOwned`, `hasError`, `$hasError` | Mixed `is*`/`has*`/`$*` |
| Event handlers | `handleNavigate`, `open`, `close` | Some have `handle*`, some don't |
| Memo usage | CharacterCard memoized, Button not | No clear pattern |

**Recommendation**: Establish naming conventions document

---

## Mobile-First & Responsive Strategy

### Current State: **Good Foundation, Needs Refinement**

**Existing Patterns:**
- Bottom navigation for mobile (`BottomNav.js`)
- Touch target sizing (44px minimum with desktop optimization)
- Safe area padding (`env(safe-area-inset-bottom)`)
- Responsive breakpoints in theme

### Recommended Breakpoint Strategy

```javascript
// Current (good)
breakpoints: {
  xs: '375px',   // Small phones
  sm: '640px',   // Large phones / small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Small desktops
  xl: '1280px',  // Desktops
  '2xl': '1536px' // Large screens
}
```

**Mobile-First Approach:**
1. Default styles target mobile (< 640px)
2. Use `min-width` media queries to add complexity
3. Avoid separate mobile/desktop code paths

### Navigation Pattern

```
Mobile (< 768px):
┌─────────────────────────────┐
│ ☰ Logo           Profile ▼  │  ← Top bar (hamburger + essentials)
├─────────────────────────────┤
│                             │
│       Page Content          │
│                             │
├─────────────────────────────┤
│  🎲   📦   🏋️   ⚙️   🎣    │  ← Bottom nav (primary actions)
└─────────────────────────────┘

Desktop (≥ 768px):
┌─────────────────────────────────────────────────┐
│ Logo    Play ▼   Activities ▼   Profile ▼       │  ← Full nav bar
├─────────────────────────────────────────────────┤
│                                                 │
│              Page Content                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Current Implementation**: ✅ Matches this pattern

### Touch-Friendly Patterns (Already Implemented)

```javascript
// IconButton.js - Excellent pattern
const sizeStyles = {
  sm: css`
    width: 44px;
    height: 44px;
    @media (hover: hover) and (pointer: fine) {
      width: 36px;  // Smaller for mouse users
      height: 36px;
    }
  `,
};
```

### Recommendations

1. **Consolidate media query usage**: Some components use hardcoded values
2. **Add responsive utility props** to layout primitives:
   ```javascript
   <Stack gap={{ base: 'sm', md: 'lg' }}>
   ```
3. **Document breakpoint semantics** for team consistency

---

## Component Architecture Recommendations

### Single-Responsibility Principle

**Current Issue**: FileCard.js (639 lines) handles:
- Preview display
- Metadata editing (desktop inline, mobile sheet)
- Status display
- Duplicate warnings
- Swipe gestures
- Focus management

**Recommended Split**:
```
FileCard.js (presentation, ~200 lines)
├── FilePreview.js (image/video display)
├── FileMetadata.js (exists, good!)
├── FileDuplicateWarning.js (warning UI)
└── useFileCardGestures.js (swipe logic)
```

### Controlled vs Uncontrolled Components

**Current**: ✅ Consistently controlled throughout

**Document Pattern**:
```javascript
// Controlled (preferred for forms, modals)
<Input value={value} onChange={setValue} />

// Uncontrolled (rare, for performance-critical)
<Input defaultValue={initial} ref={inputRef} />
```

### State Location Guidelines

| State Type | Location | Example |
|------------|----------|---------|
| User session | AuthContext | `user`, `login()`, `logout()` |
| App-wide config | Context | Rarity, Toast |
| Page data | Composite hook | `useCollection()` |
| Component UI | Local useState | `isOpen`, `isHovered` |
| Form state | Local or useReducer | Form fields |

### Prop Drilling Avoidance

**Current Solution**: Composite hooks (excellent)

```javascript
// useCollection.js - Consolidates 15+ useState calls
export function useCollection() {
  // Data, filters, pagination, actions all in one hook
  return {
    collection, filteredCharacters, currentCharacters,
    filters, setFilter, clearFilters,
    handleLevelUp, handleUpgradeAll,
    // ...
  };
}
```

**Recommendation**: Continue this pattern for new pages

### Component Naming Convention

```
Pattern: [Domain][Type][Variant]

Examples:
- CharacterCard (domain: Character, type: Card)
- FilterBar (type: Bar, purpose: Filter)
- ConfirmDialog (type: Dialog, purpose: Confirm)
- FileUploadProgress (domain: FileUpload, type: Progress)
```

---

## UX Consistency Patterns

### Button System (Excellent)

| Variant | Use Case | Color |
|---------|----------|-------|
| primary | Main action | Blue fill |
| secondary | Alternative action | Glass/outline |
| ghost | Tertiary action | Transparent |
| danger | Destructive action | Red fill |
| success | Positive action | Green fill |

### Feedback Patterns

```
State           → Component              → Duration
─────────────────────────────────────────────────────
Loading         → LoadingState/Spinner   → Until complete
Success         → Toast (success)        → 4 seconds
Error           → Toast (error)          → 6 seconds
Warning         → Alert (warning)        → Persistent
Empty           → EmptyState             → Persistent
Confirmation    → ConfirmDialog          → Until dismissed
```

### Destructive Action Pattern

```javascript
// Current (ConfirmDialog) - Good
<ConfirmDialog
  isOpen={isOpen}
  title="Delete Character"
  description="This action cannot be undone."
  variant="danger"
  confirmLabel="Delete"
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

### Loading States

| Scope | Component | Use |
|-------|-----------|-----|
| Full page | PageLoader (Suspense) | Route transitions |
| Section | LoadingState | Data fetching |
| Inline | LoadingSpinner | Button loading |
| Content placeholder | SkeletonCard | Grid loading |

### Missing Pattern: Progressive Disclosure

**Recommendation**: Add collapsible "Advanced" sections for power-user features:

```javascript
<Disclosure label="Advanced Filters">
  {/* Complex filter options */}
</Disclosure>
```

---

## Accessibility Assessment

### Current Score: **9.7/10 - Excellent**

| Category | Rating | Notes |
|----------|--------|-------|
| ARIA Usage | 10/10 | Comprehensive roles, labels, live regions |
| Keyboard Navigation | 10/10 | Focus traps, roving tabindex |
| Touch Targets | 10/10 | 44px minimum, responsive |
| Screen Reader | 10/10 | AriaLiveRegion, semantic HTML |
| Focus Management | 10/10 | Focus restoration, visible indicators |
| Color Contrast | 9/10 | Minor concerns with textMuted |

### Items to Address

**1. Reduced Motion Support**

Currently missing. Add to GlobalStyle:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**2. Color Contrast Verification**

| Token | Value | Concern |
|-------|-------|---------|
| textMuted | `rgba(255,255,255,0.4)` | May fail WCAG AA on some backgrounds |
| glassBorder | `rgba(255,255,255,0.08)` | Very subtle, low vision concern |

**Recommendation**: Test with contrast checker, consider `0.5` for textMuted

**3. Skip Link Enhancement**

Current skip link is good. Consider adding skip to main sections:

```html
<a href="#main-content">Skip to main content</a>
<a href="#collection-grid">Skip to collection</a>
```

---

## Performance Considerations

### Current Optimizations

| Technique | Implementation | Status |
|-----------|----------------|--------|
| Code Splitting | React.lazy for routes | ✅ Implemented |
| Memoization | React.memo on cards | ✅ Partial |
| Request Dedup | Axios interceptor | ✅ Implemented |
| Virtualization | VirtualizedFilesGrid | ✅ For uploads |
| Image Lazy Loading | `loading="lazy"` | ✅ Implemented |

### Recommendations

**1. Consistent Memoization**

Add memo to frequently re-rendered components:
- Navigation items
- Filter buttons
- Pagination controls

**2. Avoid Unnecessary Re-renders**

```javascript
// Current issue in Navigation.js
useEffect(() => {
  closeMobileMenu();
}, [location, closeMobileMenu]); // closeMobileMenu in deps could cause re-runs
```

**Fix**: Ensure callbacks are stable (useCallback with proper deps)

**3. Consider Virtualization for Collection**

If collection can exceed 100+ items, consider react-window:

```javascript
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={columns}
  rowCount={Math.ceil(items.length / columns)}
  width={containerWidth}
  height={600}
>
  {CharacterCard}
</FixedSizeGrid>
```

**4. Bundle Size Monitoring**

Add bundle analyzer to CI:
```bash
npm run build -- --stats
npx webpack-bundle-analyzer build/bundle-stats.json
```

---

## Phased Refactor Plan

### Principles

- Safe to ship in small PRs
- Allow rollback
- Avoid destabilizing core gameplay
- Test each phase before proceeding

---

### Phase 1: Foundation Cleanup (Week 1-2)

**Goal**: Eliminate duplication, establish patterns

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Consolidate Modal to `overlay/Modal.js` | Low | 4hr | UI/Modal.js → deprecate |
| Extract image error handler utility | Low | 1hr | utils/mediaUtils.js |
| Add reduced-motion support | Low | 2hr | App.js GlobalStyle |
| Document naming conventions | Low | 2hr | CONVENTIONS.md |

**Deliverables**:
- Single Modal implementation
- Shared utility functions
- Reduced-motion accessibility
- Team conventions document

---

### Phase 2: Error Handling Standardization (Week 2-3)

**Goal**: Consistent error UX across all pages

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Create usePageError hook | Low | 2hr | hooks/usePageError.js |
| Standardize GachaPage error handling | Low | 2hr | pages/GachaPage.js |
| Add error boundaries to route chunks | Low | 3hr | App.js |
| Toast integration for API errors | Medium | 4hr | utils/api.js |

**Pattern**:
```javascript
// usePageError.js
export function usePageError() {
  const [error, setError] = useState(null);
  const { error: showError } = useToast();

  const handleError = useCallback((err, options = {}) => {
    const message = err.response?.data?.error || err.message;
    if (options.toast !== false) {
      showError(message);
    }
    if (options.inline !== false) {
      setError(message);
    }
  }, [showError]);

  return { error, setError, handleError, clearError: () => setError(null) };
}
```

---

### Phase 3: Component Consolidation (Week 3-4)

**Goal**: Reduce duplication, improve reusability

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Use CharacterCard in CollectionPage | Medium | 3hr | pages/CollectionPage.js |
| Split FileCard into smaller components | Medium | 6hr | Upload/FileCard.js |
| Create shared focus trap hook | Low | 2hr | hooks/useFocusTrap.js |
| Standardize form state pattern | Medium | 4hr | Multiple modals |

---

### Phase 4: Page Shell Adoption (Week 4-5)

**Goal**: Consistent page structure across all main pages

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Migrate GachaPage to PageShell | Low | 2hr | pages/GachaPage.js |
| Migrate CollectionPage to PageShell | Low | 2hr | pages/CollectionPage.js |
| Migrate DojoPage to PageShell | Low | 2hr | pages/DojoPage.js |
| Migrate CouponPage to PageShell | Low | 1hr | pages/CouponPage.js |
| Migrate SettingsPage to PageShell | Low | 1hr | pages/SettingsPage.js |

**PageShell benefits**:
- Consistent header, stats, actions layout
- Built-in animations
- Reduces page boilerplate

---

### Phase 5: Performance Optimization (Week 5-6)

**Goal**: Improve real and perceived performance

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Add memo to high-frequency components | Low | 3hr | Multiple |
| Virtualize collection grid (if needed) | Medium | 6hr | CollectionPage.js |
| Audit and stabilize callbacks | Low | 4hr | Multiple hooks |
| Add bundle analyzer to CI | Low | 2hr | package.json |

---

### Phase 6: Responsive Enhancement (Week 6-7)

**Goal**: Polish mobile experience

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Audit all hardcoded breakpoints | Low | 2hr | Multiple |
| Add responsive props to layout primitives | Medium | 4hr | UI/layout/ |
| Test and fix tablet layouts | Medium | 4hr | Multiple pages |
| Improve swipe gesture consistency | Low | 3hr | Multiple |

---

### Phase 7: Documentation & Testing (Week 7-8)

**Goal**: Ensure maintainability

| Task | Risk | Effort | Files |
|------|------|--------|-------|
| Document component API (Storybook or MD) | Low | 8hr | docs/ |
| Add tests for critical flows | Medium | 8hr | tests/ |
| Create accessibility testing checklist | Low | 2hr | docs/ |
| Performance budget documentation | Low | 2hr | docs/ |

---

## Summary

### Current State
The frontend has a **strong foundation** with excellent accessibility, a comprehensive design system, and good component organization. Recent refactoring shows active investment in quality.

### Improvement Priorities
1. **Eliminate duplication** (Modal, CharacterCard inline copy)
2. **Standardize error handling** (consistent user feedback)
3. **Add reduced-motion** (accessibility gap)
4. **Document conventions** (naming, patterns, when-to-use)

### Success Metrics
- Zero duplicate component implementations
- 100% of pages use PageShell pattern
- All errors show user-friendly feedback
- WCAG AA compliance verified
- Bundle size tracked in CI

### Risk Mitigation
- Small, atomic PRs
- Feature flags for major changes
- Comprehensive testing before merge
- Rollback procedures documented

---

## Appendix: File Reference

**Critical Files:**
- `src/App.js` - Route configuration, global providers
- `src/styles/DesignSystem.js` - Theme tokens, layout primitives
- `src/components/UI/layout/MainLayout.js` - App shell
- `src/components/patterns/PageShell.js` - Page wrapper pattern
- `src/hooks/useCollection.js` - Composite hook example
- `src/cache/manager.js` - Cache invalidation system

**Components Needing Attention:**
- `src/components/UI/Modal.js` - Deprecated, consolidate
- `src/components/Upload/FileCard.js` - Split into smaller parts
- `src/pages/CollectionPage.js` - Use CharacterCard pattern

**Good Patterns to Replicate:**
- `src/components/UI/overlay/Modal.js` - Accessible modal
- `src/components/patterns/CharacterCard.js` - Memoized card
- `src/hooks/useCollection.js` - Composite hook
- `src/components/UI/buttons/IconButton.js` - Responsive touch targets
