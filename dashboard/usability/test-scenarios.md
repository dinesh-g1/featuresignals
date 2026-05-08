# Usability Test Scenarios — FeatureSignals Dashboard

---

## Scenario 1: "Create and Launch a Feature Flag"

> **Context:** You have just joined a team that uses FeatureSignals. Your
> first task is to create a feature flag for a new "dark mode" feature and
> roll it out to 10% of users.

### Precondition

- User is logged into a project with at least one environment.
- No "dark mode" flag exists yet.

### Tasks (in order)

1. **Navigate to the flag creation interface.**
   - Without guidance, find where to create a new flag.

2. **Create a boolean flag called "Dark Mode" with key `dark-mode`.**
   - Fill in name, key, and description.
   - Choose the correct flag type.

3. **Add a targeting rule: roll out to 10% of users.**
   - Find the targeting/rules section.
   - Configure a percentage rollout of 10%.

4. **Enable the flag in the "Development" environment.**
   - Turn the flag on for development.

5. **Verify the flag evaluates correctly.**
   - Use the evaluation tester or target inspector.
   - Confirm the flag returns `true` for at least some contexts.

### Success Criteria

| Criteria | Threshold |
|---|---|
| Time on task | < 3 minutes |
| Errors | < 2 wrong actions |
| SEQ rating | > 5 out of 7 |

### Key Observation Points

- Can the user find the "Create Flag" entry point?
- Does the auto-generated key suggestion help or confuse?
- Does the user understand flag types (boolean vs. multivariate)?
- Does the user discover the targeting/rules UI?
- Does the percentage slider affordance make sense?
- Can the user find the evaluation tester?

---

## Scenario 2: "Set Up a New Project with Environments"

> **Context:** Your team is starting a new microservice called "payment-service."
> You need to set up a new project in FeatureSignals with dev, staging, and
> production environments, then get the SDK keys so your team can start
> integrating.

### Precondition

- User is logged into an organization.
- The "payment-service" project does not exist yet.

### Tasks (in order)

1. **Create a new project called "Payment Service".**
   - Find where to create a project.
   - Complete the creation form.

2. **Create three environments: Development, Staging, Production.**
   - Understand the environment creation flow.
   - Name and configure each environment.

3. **Generate API keys for the Production environment.**
   - Navigate to API keys.
   - Create a server-side SDK key for production.

4. **View the SDK setup instructions.**
   - Find the quick-start or SDK setup page.
   - Locate instructions for the participant's preferred language.

### Success Criteria

| Criteria | Threshold |
|---|---|
| Time on task | < 5 minutes |
| Errors | < 3 wrong actions |
| SEQ rating | > 5 out of 7 |

### Key Observation Points

- Does the user find the "New Project" button?
- Is the project/environment hierarchy clear?
- Does the user understand server-side vs. client-side API keys?
- Is the SDK setup page discoverable?
- Does the code snippet copy mechanism work intuitively?

---

## Scenario 3: "Investigate a Flag That's Not Evaluating Correctly"

> **Context:** A colleague reports that the "beta-search" flag is returning
> `false` for everyone, even though it's supposed to be enabled for internal
> users. Your job is to figure out why.

### Precondition

- A flag named "beta-search" exists and is enabled.
- A targeting rule exists that targets users with `email` ending in
  `@company.com`.
- The flag returns `false` for `test@company.com` due to a misconfiguration
  (e.g., rule operator is "does not contain" instead of "ends with", or a
  segment override takes precedence).

### Tasks (in order)

1. **Find the "beta-search" flag.**
   - Use search or navigation to locate the flag.

2. **Review the flag's targeting rules.**
   - Inspect the current configuration.
   - Read the rules and identify what they do.

3. **Use the evaluation tester to test `test@company.com`.**
   - Open the target inspector / evaluation tester.
   - Enter a test context with `email: test@company.com`.
   - Observe the evaluation result.

4. **Diagnose why the evaluation returns `false`.**
   - Understand the rule logic.
   - Identify the misconfiguration.

5. **Explain what you would fix.**
   - Verbalize the fix (do not actually apply it).

### Success Criteria

| Criteria | Threshold |
|---|---|
| Time to diagnose | < 3 minutes |
| Diagnostic accuracy | Correct root cause identified |
| SEQ rating | > 5 out of 7 |

### Key Observation Points

- Can the user find a specific flag quickly?
- Does the evaluation result display clearly show WHY a flag evaluated a
  certain way? (The "Evaluation Transparency Principle")
- Does the target inspector form make sense?
- Can the user trace the evaluation through rules and segments?
- Does the user understand rule operators and precedence?

---

## Measurement Protocol

For each scenario, the moderator records:

1. **Time on task** — stopwatch from task start to completion (or abandonment).
2. **Error count** — clicks on wrong elements, navigation to wrong pages,
   form validation errors, confusion verbalizations.
3. **Completion** — Mark as:
   - ✅ **Completed** — all tasks accomplished without moderator help.
   - ⚠️ **Partial** — some tasks completed, or needed a hint.
   - ❌ **Failed** — could not complete the primary task.
4. **SEQ** — Ask immediately after each scenario: *"Overall, how easy or
   difficult was this task?"* (1 = Very Difficult, 7 = Very Easy).
5. **Notable quotes** — verbatim user statements revealing mental models,
   confusion, or delight.
