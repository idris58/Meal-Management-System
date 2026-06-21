## Changes Made

feat: add undoable soft deletes

- add soft-delete columns and cleanup indexes for expenses, members, and cycles
- replace hard deletes with 10-second soft-delete grace period
- add toast Undo actions for expense, member, and closed-cycle deletes
- add restore methods to meal context
- hide soft-deleted records from app and shared views
- permanently clean expired soft deletes from the server scheduler


# MealTrack — Improvement & Feature Suggestions

## 🔴 High Impact — Quick Wins

### 1. Dark Mode Support
You have `next-themes` installed but it appears the app only runs in light mode. Wire up a theme toggle:
- Add a sun/moon toggle in the sidebar or settings page
- Your shadcn/ui components already support `dark:` variants via CSS variables
- Store preference in localStorage

---

### 2. Export to PDF / Excel
Allow exporting cycle data — very useful at settlement time:
- **PDF report** — formatted summary with member balances, expenses, meal logs
- **CSV/Excel export** — raw data for spreadsheet users
- Libraries: `jspdf` + `jspdf-autotable` for PDF, or native `Blob` for CSV

---

## 🟢 UX & Polish Improvements

### 3. Onboarding / Empty States
- **First-time user walkthrough** — step-by-step guide on adding members, logging meals, etc.
- Better **empty states** with illustrations and CTAs when there are no members/expenses/meals
- Quick-start checklist: "Add members → Log first meal → Add first expense"

---

### 4. Drag-and-Drop Member Reordering
Allow reordering members in the list via drag-and-drop to prioritize the display order.

---

### 5. Improved Mobile Experience
The app has PWA support but could be more mobile-optimized:
- **Bottom navigation bar** on mobile (instead of just the sidebar)
- **Swipe gestures** for navigating between pages
- **Pull-to-refresh** for data reload
- Haptic feedback on meal count +/- buttons

---

### 6. Undo/Redo Support
- Add toast-based "Undo" action after deleting an expense, member, or meal log
- Implement soft-delete with a grace period before permanent removal
- Reduces accidental data loss

---

## 🔧 Technical Improvements

### 7. Data Pagination
The app loads ALL expenses, meal logs, deposits, and changelog entries at once:
- Add pagination or infinite scroll for large datasets
- Lazy-load closed cycle details only when expanded
- Critical for long-running groups with many cycles

> [!WARNING]
> As users accumulate more cycles and data, the current "load everything" approach in [meal-context.tsx] will become a performance bottleneck. Consider lazy-loading per cycle.

---

### 8. Automated Tests
No test files exist in the project:
- Add **unit tests** for calculation logic (meal rate, balances, settlement check)
- Add **integration tests** for API routes
- Consider Vitest (already in the Vite ecosystem)

---

## 💡 Nice-to-Have / Future Ideas

### 9. Multi-Language Support (i18n)
Given the Bangladeshi user base, add:
- Bengali (বাংলা) language option
- English as default
- Use `react-i18next` or similar

### 10. Analytics Dashboard for Managers
- Cost-per-member comparison over time
- Average meal rate trend
