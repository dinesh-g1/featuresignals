# FeatureSignals Content Voice Guide

> **Version:** 1.0.0  
> **Applies To:** All dashboard copy — button labels, headings, descriptions, error messages, success messages, empty states, loading states, tooltips, documentation  
> **Based On:** MASTER_PLAN.md Section 3.4 — "Content Voice — Consistent Across All Surfaces"  
> **Owner:** Engineering + Design

---

## Voice Attributes

FeatureSignals speaks with a single voice across every surface. When a user reads a button, an error message, or an empty state, it should feel like the same person is talking to them.

### The Four Attributes

| Attribute | What It Means | Example |
|-----------|---------------|---------|
| **Clear** | Users understand instantly. No ambiguity. No guessing. | `"Flag key 'dark mode' contains spaces. Try 'dark-mode'."` |
| **Concise** | Every word earns its place. Short sentences. Direct language. | `"No flags yet. Create your first flag."` |
| **Human** | Natural language, not robotic. "You" and "your team." | `"Your flags"` not `"User flag inventory"` |
| **Empowering** | Users feel capable. Errors offer solutions. | `"Failed to save. Check your connection and try again."` |

---

## Tone

**Confident, helpful, direct.** Not salesy. Not overly technical. Not condescending.

| Do | Don't |
|----|-------|
| "Here's what happened" | "Oops! Something went wrong!" |
| "Flag created in Production." | "Success! Your flag has been successfully created. Great job!" |
| "We couldn't save your changes." | "An unexpected error occurred while processing your request." |
| "Try refreshing the page." | "Please attempt to reload the browser window at your earliest convenience." |

---

## Word List

### Preferred Terms

| Preferred | Avoid |
|-----------|-------|
| Flag | Toggle, switch, feature gate (use "flag" consistently) |
| Environment | Env, stage |
| Organization | Org (acceptable in UI due to space constraints) |
| Project | Workspace, space |
| Create | Add, new, make |
| Delete | Remove, destroy, trash |
| Save | Submit, commit, persist |
| Cancel | Dismiss, close, abort |
| You / Your team | Users, accounts, members |
| Sign in | Log in, login (use "sign in" as verb, "login" as noun only) |
| Sign up | Register, create account |
| Plan | Tier, level, subscription level |

### Banned Terms

| Banned | Because |
|--------|---------|
| "Oops!" | Condescending, unprofessional |
| "Uh-oh" | Same as above |
| "Successfully" | Redundant — if it's a success message, the user knows |
| "Please" (when begging) | Use "Try" instead — more actionable. "Please wait" → "Waiting for server..." |
| Exclamation marks (!) | Never in error/success messages. Only in empty state illustrations (metaphorically). |
| "Invalid" (alone) | Always explain WHY. "Invalid input" → "Flag key contains spaces." |
| "Error occurred" | Be specific. "Error occurred" → "Failed to load flags. Our servers may be down." |
| "Click here" | Use descriptive links. "Click here to create" → "Create a flag" |

---

## Patterns

### Button Labels

Buttons are verb-first, sentence case, no ending punctuation.

| Pattern | Example | Anti-pattern |
|---------|---------|-------------|
| Primary action | `Create flag` | `Flag create`, `Create Flag` |
| Destructive action | `Delete project` | `Remove`, `Yes, delete` |
| Cancel / Dismiss | `Cancel` | `Never mind`, `Go back` |
| Save / Confirm | `Save changes` | `Submit`, `OK` |
| Retry | `Try again` | `Retry`, `Reload` |

### Empty States

Format: **"No [thing] yet. [Action] to get started."**

| Page | Message |
|------|---------|
| Projects | `No projects yet. Create your first project to get started.` |
| Flags | `No flags yet. Create your first flag to start managing features.` |
| Environments | `No environments yet. Add an environment to organize your flags.` |
| Segments | `No segments yet. Create a segment to target specific users.` |
| API Keys | `No API keys yet. Create an API key to connect your application.` |
| Team | `No team members yet. Invite your team to collaborate.` |

### Error Messages

Format: **"[What] didn't work because [why]. [How to fix]."**

| Scenario | Message |
|----------|---------|
| Network failure | `Failed to load flags. Check your internet connection and try again.` |
| Server error | `Something went wrong on our end. Try again in a moment.` |
| Validation (spaces in key) | `Flag key 'my flag' contains spaces. Use hyphens instead: 'my-flag'.` |
| Validation (missing name) | `Project name is required. Give your project a name.` |
| Duplicate | `A flag with key 'dark-mode' already exists. Choose a different key.` |
| Unauthorized | `Your session has expired. Sign in again to continue.` |
| Forbidden | `You don't have permission to do that. Contact your admin if you think this is a mistake.` |
| Not found | `The flag you're looking for doesn't exist. It may have been deleted.` |
| Rate limited | `Too many requests. Wait a moment and try again.` |
| Payment required | `This feature requires the Pro plan. Upgrade to continue.` |

### Success Messages

Format: **"[Action completed] in [context]."**

| Scenario | Message |
|----------|---------|
| Flag created | `Flag 'dark-mode' created in Production.` |
| Flag toggled | `Flag 'dark-mode' turned on in Staging.` |
| Project created | `Project 'My App' created.` |
| Settings saved | `Settings saved.` |
| API key created | `API key created. Copy it now — you won't see it again.` |

### Loading States

Skeleton screens with shimmer animation. No "Loading..." text unless operation takes > 500ms.

If a text description is needed:
- `Loading flags...` (not "Please wait while we load your flags")
- `Checking permissions...` (not "Authenticating your session")

---

## Capitalization

**Sentence case for everything** — buttons, labels, headings, placeholders, tooltips, menu items.

| Correct | Incorrect |
|---------|-----------|
| `Create flag` | `Create Flag` |
| `Project name` | `Project Name` |
| `No flags yet` | `No Flags Yet` |
| `Save changes` | `Save Changes` |

**Exception:** Proper nouns (Product names: "FeatureSignals", "OpenFeature"; Environment names: "Production", "Staging").

---

## Punctuation

| Rule | Example |
|------|---------|
| No periods on single-sentence headings, buttons, or CTAs | `Create flag` not `Create flag.` |
| Periods on multi-sentence descriptions | `Flags let you control features across environments. Create a flag to get started.` |
| No exclamation marks in UI copy | `Settings saved.` not `Settings saved!` |
| Use hyphens in compound adjectives | `Feature-flag management` |
| Use em-dashes for asides (sparingly) | `Your flags control what users see — toggle them anytime.` |

---

## Error States by NNGroup Framework

Per MASTER_PLAN.md Section 2.3-I, error messages must be:

| Principle | Guideline | Example |
|-----------|-----------|---------|
| **Visible** | Error is near the problem; highlighted; icon + text | Red inline message below the invalid field |
| **Communicative** | Says what happened in plain language; never "Error 0x500" | `Flag key contains spaces. Use hyphens.` |
| **Efficient** | Minimum reading; no paragraphs; includes fix | `Name is required.` not `The name field has not been filled...` |
| **Safe** | No data loss; undo available; confirmation for destructive actions | Delete confirmation with checkbox + `Delete project` button |

---

## Examples in Context

### Good

```
Page title: Feature flags
Description: Manage and toggle your feature flags across environments.
Empty state: No flags yet. Create your first flag to start managing features.
Error: Failed to load flags. Check your connection and try again.
Success: Flag 'dark-mode' created in Production.
Delete dialog: Are you sure you want to delete 'dark-mode'? This will permanently remove it from all environments. This action cannot be undone.
```

### Bad (and why)

```
Page title: User Flag Inventory Management Console  ← Too verbose, uses "user" not "your"
Empty state: You don't have any flags. ← Missing action
Error: Error: 500 Internal Server Error ← Exposes internals, no fix suggestion
Success: Flag successfully created! ← Redundant "successfully" + exclamation mark
Delete dialog: Delete flag? This is permanent. ← Not specific enough
```
