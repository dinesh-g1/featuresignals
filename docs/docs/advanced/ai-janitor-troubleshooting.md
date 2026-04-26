---
title: Troubleshooting
description: Common issues and solutions for the AI Janitor
sidebar_position: 7
---

# Troubleshooting

## PR Generation Issues

### PR Has Merge Conflicts

The generated PR has conflicts with the target branch.

**Solutions:**
1. Click **Regenerate** on the stale flag row to create a fresh PR
2. Pull the branch and resolve conflicts manually:
   ```bash
   git checkout janitor/remove-{flag-key}
   git merge main
   # Resolve conflicts
   git push
   ```
3. If the flag has changed significantly, dismiss it and re-scan

### LLM Analysis Returned Low Confidence

The AI is unsure about safely removing this flag.

**Why this happens:**
- Complex nested conditionals (3+ levels deep)
- Dynamic flag references (e.g., `isEnabled(variableName)`)
- Flag used in test assertions
- Unusual language patterns

**Solutions:**
1. Review the analysis notes for specific concerns
2. Manually inspect the flagged references
3. Consider refactoring the flag usage to be more analyzable
4. Dismiss if you've confirmed it's safe manually

## Connection Issues

### Repository Not Found

**Causes:**
- Token doesn't have access to the repository
- Repository was renamed or deleted
- Organization access not granted

**Solutions:**
1. Verify the token has access to the repository
2. Reconnect the provider in Settings → Integrations
3. Check that the repository exists and is accessible

### Token Expired

**Solution:** Reconnect the provider in Settings → Integrations

### LLM Provider Unavailable

**Causes:**
- API key expired or invalid
- Rate limit exceeded
- Provider outage

**Solutions:**
1. Check your API key in Settings → Integrations → LLM Provider
2. Wait for rate limit to reset (typically 1 minute)
3. The system will automatically fall back to regex analysis

## Analysis Issues

### Flag is Referenced in Unexpected Ways

**Examples:**
- Dynamic key construction: `isEnabled("prefix-" + flagName)`
- String interpolation in templates: `` `${isEnabled("flag") ? A : B}` ``
- Flag stored in a variable: `const isEnabled = boolVariation("flag", user)`

**Solutions:**
1. The LLM can handle many of these cases — review the analysis
2. If the LLM also misses it, manually inspect the code
3. Consider standardizing flag usage patterns across your codebase

### Generated PR Breaks Tests

**Causes:**
- Test files reference the removed flag
- The removed conditional had side effects

**Solutions:**
1. Check if test files were correctly updated
2. Review the diff for any missed references
3. Manually fix the test assertions
4. Update the test to not depend on the removed flag

## Compliance Issues

### LLM Processing Disabled by Policy

Your organization's compliance policy has disabled LLM processing.

**What happens:**
- The Janitor falls back to regex-based analysis
- Analysis confidence is lower (35%)
- PRs include "Manual Review Required" warnings

**To enable LLM:**
1. Go to **Settings → Integrations → Compliance**
2. Set mode to **Approved** or **Strict**
3. Configure approved providers

### Data Masking is Blocking Analysis

Redaction rules are too aggressive and are redacting valid code patterns.

**Solutions:**
1. Review your redaction rules in Compliance settings
2. Disable specific rules that are too broad
3. Use more specific regex patterns

## Getting Help

If you're still having issues:
- Check the [AI Janitor documentation](/docs/advanced/ai-janitor)
- Contact support at support@featuresignals.com
- Join our Slack community for real-time help