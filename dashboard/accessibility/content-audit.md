# Content Voice Audit — FeatureSignals Dashboard

> **Audit Date:** 2026-05-14  
> **Standard:** `dashboard/CONTENT_VOICE.md`  
> **Auditor:** Automated review + manual inspection  
> **Status:** Complete

---

## Scope

The following surfaces were audited for content voice consistency:

- [x] App layout (nav items, sidebar labels)
- [x] `/projects` page (heading, empty state, actions)
- [x] `/projects/[projectId]/flags` (heading, empty state, create form)
- [x] `/projects/[projectId]/flags/[flagKey]` (tabs, labels, descriptions)
- [x] `/settings` (all settings labels and descriptions)
- [x] Error messages across the app
- [x] Loading skeletons and their text
- [x] Toast/success messages

---

## Findings & Fixes

### Finding 1: Button Label Capitalization

**Found:** Some button labels used Title Case instead of sentence case.

| File | Before | After | Status |
|------|--------|-------|--------|
| `projects/page.tsx` | `Create Project` (in multiple places) | `Create project` | ✅ Fixed |
| `projects/page.tsx` | `Delete project` (was correct) | — | ✅ Already correct |
| `projects/page.tsx` | `Save changes` (was correct) | — | ✅ Already correct |
| `flags/page.tsx` | `Create Flag` | `Create flag` | ✅ Fixed |

### Finding 2: Empty State Messaging

**Found:** Empty states were largely consistent but needed minor adjustments.

| Page | Before | After | Status |
|------|--------|-------|--------|
| Projects | `No projects yet` with good CTA text | Unchanged — already correct | ✅ |
| Flags | Needs review in `flags/page.tsx` | Updated to: "No flags yet. Create your first flag to start managing features." | ✅ Fixed |

### Finding 3: Success Message Consistency

**Found:** Success messages via `showFeedback` and `toast` are concise but some could be more informative per the Content Voice format.

| Location | Before | After | Status |
|----------|--------|-------|--------|
| `projects/page.tsx` | `Project created` | `Project created.` (added period per style guide for multi-word) | ✅ Fixed |
| `projects/page.tsx` | `Project updated` | `Project updated.` | ✅ Fixed |
| `projects/page.tsx` | `Project deleted` | `Project deleted.` | ✅ Fixed |

### Finding 4: Error Message Format

**Found:** Error messages follow a generally good pattern but some could be more actionable.

| Location | Before | After | Status |
|----------|--------|-------|--------|
| `projects/page.tsx` | `err.message` (varies) | Error messages from API are preserved; the content voice standard will be applied at the API layer. Validation errors in the form are already properly formatted. | ⚠️ Deferred |
| `global-error.tsx` | Already excellent — maps error patterns to friendly messages | — | ✅ Already correct |

### Finding 5: Navigation Labels

**Found:** Navigation labels in `nav-list.tsx` are consistent, use sentence case, and are clear.

| Item | Label | Assessment |
|------|-------|------------|
| Dashboard | `Dashboard` | ✅ Clear |
| Feature flags | `Feature flags` | ✅ Sentence case |
| Environments | `Environments` | ✅ Clear |
| Segments | `Segments` | ✅ Clear |
| Audit log | `Audit log` | ✅ Clear |
| Activity | `Activity` | ✅ Clear |
| API keys | `API keys` | ✅ Clear |
| Webhooks | `Webhooks` | ✅ Clear |
| Team | `Team` | ✅ Clear |
| Settings | `Settings` | ✅ Clear |

All labels are sentence case where appropriate. No violations found.

### Finding 6: Settings Page Labels

**Found:** Settings tab labels are clear, concise, and use sentence case.

| Tab | Label | Assessment |
|-----|-------|------------|
| General | `General` | ✅ Clear |
| Integrations | `Integrations` | ✅ Clear |
| Notifications | `Notifications` | ✅ Clear |
| Billing | `Billing` | ✅ Clear |
| Team | `Team` | ✅ Clear |
| SSO | `SSO` | ✅ Clear |
| API keys | `API keys` | ✅ Clear |
| Webhooks | `Webhooks` | ✅ Clear |

### Finding 7: Toast Messages

**Found:** Toast messages in `toast.tsx` are concise and use proper icon associations. The toast container now has `role="status"` and `aria-live="polite"` for accessibility.

| Type | Icon | Style | Assessment |
|------|------|-------|------------|
| Success | CheckCircle | Green muted bg | ✅ Appropriate |
| Error | AlertTriangle | Red muted bg | ✅ Appropriate |
| Info | Info | Blue muted bg | ✅ Appropriate |

### Finding 8: Loading States

**Found:** Loading states use skeleton screens with shimmer animation (consistent with Content Voice standard). No "Loading..." text exists outside of button loading states, which is correct per the standard.

| Component | Pattern | Assessment |
|-----------|---------|------------|
| Projects page | Skeleton cards in grid | ✅ No text, shimmer only |
| `SkeletonList` | List rows with shimmer | ✅ No text, shimmer only |
| `PageHeaderSkeleton` | Shimmer blocks | ✅ No text, shimmer only |
| `DataTableSkeleton` | Table shimmer | ✅ No text, shimmer only |
| Button loading | Spinner + `Saving...` text | ✅ Appropriate for context |

### Finding 9: Flag Detail Page Tab Labels

**Found:** The flag detail page uses descriptive tab labels.

Tab labels are concise and use sentence case. ✅ Correct.

### Finding 10: Delete Confirmation Language

**Found:** The delete confirmation dialog in `projects/page.tsx` uses clear, specific language about what will be permanently deleted.

**Current text:** "Are you sure you want to delete [name]? This will permanently delete all flags, environments, and segments in this project."

**Assessment:** ✅ This follows the Content Voice standard — specific about consequences, uses "you", clear about irreversibility.

---

## What Remains

| Item | Reason | Priority |
|------|--------|----------|
| API error messages | Error messages come from the Go server. These should be updated at the API layer to follow the Content Voice format. | Medium (backend change) |
| Auth pages (login, register) | Auth pages were not deeply audited in this pass; they use concise, functional copy. Full audit recommended in next pass. | Low |
| Tooltip / help text | Some `FieldHelp` and `HelpTooltip` components may benefit from a dedicated copy review. | Low |
| Marketing pages | The website (`featuresignals/website/`) is out of scope for this dashboard audit. | N/A |

---

## Summary

The dashboard's content voice is in good shape. The writing is already:
- **Confident and direct** — No condescending language found
- **Verb-first** — Button labels follow the verb-first pattern
- **Concise** — Error messages and success messages are short
- **Human** — Uses "you" and "your" throughout

The fixes applied were minor capitalization corrections to align button labels with the sentence-case standard across all instances.

**Overall Assessment:** 8/10 — Strong baseline. The remaining work is backend-side error message improvements and a deeper tooltip/help-text review.
