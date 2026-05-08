# Moderator Session Script

> **Keep this open during each session.** Follow the script exactly. Speak
> naturally — don't read it like a robot. Italicized text is instruction for
> the moderator.

---

## Phase 1: Introduction (5 min)

### Welcome

> *Start recording. Confirm consent.*

"Hi [Participant Name], thanks so much for taking the time today. My name is
[Moderator Name], and I'll be walking you through this session.

Before we dive in, I want to emphasize: **we are testing the product, not
you.** There are no wrong answers, no wrong clicks, and nothing you can do
that will hurt my feelings. If something is confusing, that's exactly what we
need to know — it means we designed it poorly.

I'm going to ask you to **think out loud** as you use the product. Just say
whatever comes into your head — what you're looking for, what you expect,
what surprises you, what you're unsure about. Like a running commentary.

If you go quiet for a bit, I might prompt you with 'what are you thinking?'
That's not because you're doing anything wrong — it's just to keep the
commentary flowing.

Do you have any questions before we start?"

### Consent

> *Share consent form. Wait for signature.*

"This session is being recorded — both your screen and audio. The recording
will only be seen by our product team and will be deleted after the report is
complete. Your name will not appear in any published findings. Is that okay
with you?"

☐ Consent obtained
☐ Recording started

---

## Phase 2: Pre-Test Questionnaire (5 min)

"Before we look at the product, I'd like to ask a few quick questions about
your background."

1. "What's your current role and what kind of work do you do day-to-day?"
2. "Have you used any feature flag or feature management tools before?"
   - *If yes:* "Which ones? How would you describe your experience?"
   - *If no:* "What do you understand feature flags to be?"
3. "How do you currently manage rolling out new features to users?"
4. "On a scale of 1–10, how comfortable are you with developer tools and
   dashboards?"
5. "Is there anything you're hoping this tool will help you with?"

> *Record answers in session notes.*

---

## Phase 3: Scenario 1 — "Create and Launch a Feature Flag" (8–12 min)

> *Share the test environment URL. Ask them to share their screen.*

### Task Instructions (read verbatim)

"I'm going to give you a scenario. Read it, and then start whenever you're
ready. Remember to think out loud."

> *Paste the scenario into chat or share screen with scenario visible:*

**Scenario:** "You have just joined a team that uses FeatureSignals. Your
first task is to create a feature flag for a new 'dark mode' feature and roll
it out to 10% of users. Please go ahead and do that now."

### During the Task

> *Start stopwatch. Observe silently.*

**Prompt only if:**
- Participant is silent for > 10 seconds: "What are you thinking?"
- Participant is clearly stuck and frustrated for > 2 minutes: Offer a
  minimal hint (note this in the session notes).
- Participant asks a direct question: "What would you do if I weren't here?"

**Watch for:**
- Where do they click first?
- Do they hesitate at any controls?
- Do they read labels/dialogs or skip them?
- Do they make errors? Do they recover?

### After the Task

> *Stop stopwatch. Record time.*

"Thank you. Now, on a scale of 1 to 7 — where 1 is 'very difficult' and 7 is
'very easy' — how would you rate that task overall?"

☐ SEQ Score: __ / 7

"Can you tell me a bit more about why you gave it that rating?"

> *Record quotes.*

---

## Phase 4: Scenario 2 — "Set Up a New Project with Environments" (8–12 min)

### Task Instructions (read verbatim)

**Scenario:** "Your team is starting a new microservice called
'payment-service.' You need to set up a new project in FeatureSignals with
dev, staging, and production environments, then get the SDK keys so your team
can start integrating. Please go ahead."

### During the Task

> *Start stopwatch. Observe silently. Same prompting rules as Scenario 1.*

### After the Task

> *Stop stopwatch. Record time.*

"On the same 1–7 scale, how easy or difficult was that task?"

☐ SEQ Score: __ / 7

"What made it that rating?"

---

## Phase 5: Scenario 3 — "Investigate a Flag Not Evaluating Correctly" (8–12 min)

### Task Instructions (read verbatim)

**Scenario:** "A colleague reports that the 'beta-search' flag is returning
`false` for everyone, even though it's supposed to be enabled for internal
users. Your job is to figure out why. Please go ahead."

### During the Task

> *Start stopwatch. Observe silently.*

**Watch especially for:**
- Can they find the flag quickly?
- Do they understand the targeting rule display?
- Do they use the evaluation tester?
- Can they trace the evaluation logic?
- Do they correctly diagnose the root cause?

### After the Task

"On the 1–7 scale, how easy or difficult was diagnosing the issue?"

☐ SEQ Score: __ / 7

"What was the root cause? *(Confirm they identified it correctly.)*"

---

## Phase 6: System Usability Scale (3 min)

"Now I have 10 standard questions about the system overall. For each one,
rate how much you agree from 1 (Strongly Disagree) to 5 (Strongly Agree).
Go with your gut — don't overthink it."

| # | Statement | Rating (1–5) |
|---|---|---|
| 1 | I think that I would like to use this system frequently. | ☐ |
| 2 | I found the system unnecessarily complex. | ☐ |
| 3 | I thought the system was easy to use. | ☐ |
| 4 | I think that I would need the support of a technical person to be able to use this system. | ☐ |
| 5 | I found the various functions in this system were well integrated. | ☐ |
| 6 | I thought there was too much inconsistency in this system. | ☐ |
| 7 | I would imagine that most people would learn to use this system very quickly. | ☐ |
| 8 | I found the system very cumbersome to use. | ☐ |
| 9 | I felt very confident using the system. | ☐ |
| 10 | I needed to learn a lot of things before I could get going with this system. | ☐ |

---

## Phase 7: Post-Test Interview (5–10 min)

"Just a few final questions."

1. "What was the single most frustrating moment in today's session?"
2. "What was the most pleasant or intuitive part?"
3. "If you could change one thing about this dashboard, what would it be?"
4. "Is there anything you expected to find that wasn't there?"
5. "How does this compare to other developer tools you use?"
6. "Would you recommend this tool to a colleague? Why or why not?"
7. "Is there anything else you'd like to share?"

> *Record answers in session notes.*

---

## Phase 8: Wrap-Up

"That's everything! Thank you so much for your time — your feedback is
incredibly valuable to us. We'll use what we learned today to make the
product better."

> *Stop recording. Confirm incentive/gift card delivery.*

---

## Moderator Cheat Sheet

### Prompting Rules

| Situation | What to Say |
|---|---|
| Silence > 10 sec | "What are you thinking?" |
| User asks "Is this right?" | "What do you think?" |
| User asks "What does this do?" | "What do you expect it to do?" |
| User is stuck > 2 min | Give minimal hint. **Note it.** |
| User criticizes the UI | "Tell me more about that." |
| User expresses delight | "What makes that work well for you?" |

### Never

- Never say "No, that's wrong."
- Never lead with "Click the blue button."
- Never explain how the product works during the test.
- Never defend design decisions.
- Never rush the participant.

### If Technology Fails

- **Screen share drops:** "Let's pause for a moment while we reconnect."
  Pause stopwatch.
- **App crashes:** Apologize, note the event, restart, and resume from the
  same task. Resume stopwatch.
- **Audio issues:** Switch to phone call for audio, keep video/screen share.
