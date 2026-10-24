# JobSentry UI/UX Modernization & Accessibility Plan

A prioritized implementation plan to address all 14 UI/UX recommendations across high, medium, and low priority tiers, ensuring mobile responsiveness, accessible semantic risk color schemes, WCAG keyboard navigation, responsive history layouts, and clean plain-language copy.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 clarification:
> - **Risk-Level Color Scheme**: Accessible high-contrast **Emerald Green** (Low Risk), **Amber Orange** (Medium Risk), and **Crimson Red** (High Risk), paired with explicit textual labels and distinct icons to ensure WCAG AA color-blind accessibility.
> - **Developer Controls (Staging/Prod & Offline Test)**: Collapsed into a dedicated, discreet "Demo & Debug Settings" drawer/popover with plain-language explanations, keeping the top navigation clean and focused on end-user tasks.
> - **Mobile History Layout**: Dynamic dual-view architecture: a responsive, touch-friendly card list on mobile viewports (`< 768px`) and a high-density data table on desktop viewports (`≥ 768px`).

---

## 1. Overview & Core Concept

- **Goal**: Elevate the user experience of JobSentry to production-grade quality by resolving mobile friction, enhancing visual clarity, complying with accessibility standards, and replacing developer-facing jargon with natural, user-friendly language.
- **Key Beneficiaries**: Mobile applicants scanning postings on smartphones, users with screen readers or keyboard navigation needs, and presenters conducting live viva demonstrations.

---

## 2. Detailed Fix Breakdown by Priority

### High Priority Fixes

#### 1. Accessible Risk-Level Visualization
- **Low Risk**: Emerald Green (`text-emerald-600 dark:text-emerald-400`, `bg-emerald-50 dark:bg-emerald-950/40`, `border-emerald-200 dark:border-emerald-800`), `ShieldCheck` icon, text label "Low Risk".
- **Medium Risk**: Amber Orange (`text-amber-600 dark:text-amber-400`, `bg-amber-50 dark:bg-amber-950/40`, `border-amber-200 dark:border-amber-800`), `AlertTriangle` icon, text label "Medium Risk".
- **High Risk**: Crimson Red (`text-rose-600 dark:text-rose-400`, `bg-rose-50 dark:bg-rose-950/40`, `border-rose-200 dark:border-rose-800`), `ShieldAlert` icon, text label "High Risk".
- **Progress Bar Alignment**: Score progress bar filled with the matching semantic color (Emerald, Amber, or Crimson) instead of pure monochrome.

#### 2. Responsive Mobile Navigation
- Add a mobile hamburger button (`aria-label="Open navigation menu"`) in `Navbar.tsx`.
- Slide-out mobile drawer with touch targets $\ge 44\text{px}$ linking to:
  - Scanner (`#scanner`)
  - Research & ML (`#research`)
  - Workflow (`#how-it-works`)
  - Scam Patterns (`#common-scams`)
  - Helpline 1930 (`#helpline`)
  - Past Scans (`#history`)
- Includes quick theme toggle and demo drawer toggle inside mobile view.

#### 3. Full Accessibility & Keyboard Navigation
- Add explicit `aria-label` attributes to all icon-only buttons (copy, clear, paste, theme toggle, mobile toggle, modal close).
- Ensure all interactive elements feature visible focus rings: `focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:outline-none`.
- Set `role="region"` and `aria-live="polite"` on error alerts and score notifications.

---

### Medium Priority Fixes

#### 4. Developer & Demo Controls Drawer
- Remove prominent Prod/Staging and 503 test toggles from the top navigation bar.
- Replace with a subtle "Demo Controls" button that opens an accessible dropdown/drawer containing:
  - Environment Mode switcher (Production vs. Staging with factor inspection).
  - Network Failure Simulation toggle (HTTP 503 resilience testing).
  - Clear explanations of what each setting demonstrates.

#### 5. History Empty States & Filter Recovery
- **No Records State**: "No job postings analyzed yet. Scan a posting above or load a sample scenario to start tracking." + "Load Sample Scan" button.
- **No Filter Matches State**: "No scans match the search filter \"[term]\". Try adjusting your search or risk level." + "Clear Search & Filter" button.

#### 6. Date & Time Timestamps
- Update timestamp formatting across the table and detail cards:
  - Format: `Oct 23, 2026 · 10:45 AM` (`toLocaleDateString` + `toLocaleTimeString`).

#### 7. Mobile History Cards vs. Desktop Table
- **Mobile (`md:hidden`)**: Render list of cards displaying company, date/time, risk badge, score bar, job snippet, and "Inspect" button.
- **Desktop (`hidden md:block`)**: Preserve the high-density tabular view with tabular numerals.

#### 8. Dynamic Currency Display
- Parse user salary input:
  - If input already starts with a currency symbol (`$`, `₹`, `€`, `£`, `C$`, `A$`), display as entered.
  - If input is pure numeric, display clean formatted number with a generic label (e.g. `85,000 / year` or `85,000`). Never hardcode `$` when unstated.

#### 9. Enhanced Score Bar Visualization
- Display score with percentage and contextual severity descriptor:
  - High ($\ge 0.65$): Crimson progress bar with label `"Critical Risk Indicator (78%)"`.
  - Medium ($0.35 - 0.64$): Amber progress bar with label `"Moderate Risk Indicator (52%)"`.
  - Low ($< 0.35$): Emerald progress bar with label `"Low Risk Indicator (12%)"`.

#### 10. Readability & Mobile Touch Target Ergonomics
- Ensure all inputs, select buttons, and action buttons have minimum touch targets of $44\text{px}$ on mobile.
- Set input text size to `16px` on mobile (`text-base sm:text-xs`) to prevent mobile Safari viewport zooming.
- Improve spacing and padding inside form cards.

---

### Low Priority Fixes

#### 11. Responsive Example Menu
- Constrain example popup menu on mobile: `max-w-[calc(100vw-2rem)] w-80 right-0 sm:right-0` with scroll overflow prevention.

#### 12. Copy Feedback Toast
- Provide clear, accessible feedback (e.g., inline "Copied to clipboard!" notification with checkmark icon, reverting after 2 seconds) for report and paper copying.

#### 13. Accessible History Detail Dialog
- Add global keyboard listener for `Escape` key to close the dialog.
- Trap focus within modal while open and return focus to the trigger button upon close.
- Add `aria-labelledby` and `aria-describedby` attributes.

#### 14. Plain, Professional Language (Anti-Jargon)
- Replace developer terms with friendly consumer copy:
  - *"Pre-Application Advisory Engine · Zero Fallback Invariants"* $\rightarrow$ *"Pre-Application Job Scam Scanner · Free & Advisory"*
  - *"Audit Invariant Database · SQLite Schema: checks"* $\rightarrow$ *"Past Job Scan History"*
  - *"Evaluation Result · Staging"* $\rightarrow$ *"Scan Result · Staging Demo"*
  - *"Inspect Invariant Rules"* $\rightarrow$ *"Scan for Scam Signals"*

---

## 3. Technical Architecture & Component Impact

```
┌─────────────────────────────────────────────────────────────┐
│                         Navbar.tsx                          │
│  - Responsive Mobile Hamburger + Slide-out Drawer           │
│  - Discreet "Demo Controls" Popover (Prod/Staging, 503)     │
│  - Accessible aria-labels on Theme & Menu toggles           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                      HeroAndForm.tsx                        │
│  - Plain-language header & responsive example popover       │
│  - 44px touch targets & 16px mobile input font sizes        │
│  - Flexible currency validator without hardcoded dollar     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                       ResultCard.tsx                        │
│  - Accessible semantic risk badges (Emerald / Amber / Rose) │
│  - Color-coordinated score progress bar with percentage     │
│  - Inline copy notification toast                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                      HistoryTable.tsx                       │
│  - Dual-layout: Mobile Cards (<768px) & Desktop Table       │
│  - Accessible Dialog with Escape key & focus management     │
│  - Contextual Empty States (No records vs No filter matches)│
│  - Full date + time formatting                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Verification Plan

1. **Compilation Check**: Run `compile_applet` to verify zero TypeScript errors.
2. **Responsive Layout Verification**:
   - Mobile viewport ($375\text{px} - 414\text{px}$): Verify hamburger drawer, example menu alignment, and mobile history cards.
   - Tablet/Desktop viewport ($768\text{px} - 1440\text{px}$): Verify table layout, top bar links, and demo popover.
3. **Accessibility & Keyboard Navigation**:
   - Verify `Tab` and `Shift+Tab` navigation across all controls with visible focus rings.
   - Verify `Escape` key closes the history detail dialog and example menu.
   - Verify screen reader labels on icon-only buttons.
4. **End-to-End Functional Test**:
   - Execute sample scan, verify accessible risk badge, test copy feedback toast, verify history persistence with complete date/time.
