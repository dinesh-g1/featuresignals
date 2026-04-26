---
title: Git Provider Setup
description: Configure GitHub, GitLab, and Bitbucket for the AI Janitor
sidebar_position: 3
---

# Git Provider Setup

The AI Janitor needs access to your Git repositories to scan for stale flag references and generate cleanup PRs. This guide covers setup for each supported provider.

## GitHub

### Option A: GitHub App (Recommended)

1. Go to **Settings → Developer settings → GitHub Apps**
2. Click **New GitHub App**
3. Configure:

| Setting | Value |
|---------|-------|
| GitHub App name | `featuresignals-janitor-{your-org}` |
| Homepage URL | `https://featuresignals.com` |
| Callback URL | `https://app.featuresignals.com/api/v1/janitor/oauth/github/callback` |
| Webhook URL | `https://app.featuresignals.com/api/v1/janitor/webhooks/github` |
| Webhook secret | Generate a random secret |

4. **Permissions:**
   - Repository contents: **Read & write**
   - Pull requests: **Read & write**
   - Metadata: **Read**
   - Webhooks: **Read & write**

5. **Subscribe to events:**
   - Pull request
   - Push

6. Generate a **private key** and note the **App ID**

7. In FeatureSignals, go to **Settings → Integrations → GitHub**
8. Paste the App ID and private key

### Option B: Personal Access Token (Quick Setup)

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set:
   - Repository access: **Only select repositories** (recommended)
   - Permissions: **Contents: Read & write**, **Pull requests: Read & write**
4. Copy the token
5. In FeatureSignals, paste the token in the **Connect** field

## GitLab

### Option A: OAuth Application

1. Go to **GitLab → Settings → Applications**
2. Create a new application:

| Setting | Value |
|---------|-------|
| Name | `FeatureSignals AI Janitor` |
| Redirect URI | `https://app.featuresignals.com/api/v1/janitor/oauth/gitlab/callback` |
| Scopes | `api`, `read_repository`, `write_repository` |

3. Note the **Application ID** and **Secret**
4. Configure in FeatureSignals settings

### Option B: Project/Group Access Token

1. Go to **GitLab → Settings → Access Tokens**
2. Create a token with scopes: `api`, `read_repository`, `write_repository`
3. Copy the token
4. Paste in FeatureSignals

## Bitbucket

### OAuth Consumer

1. Go to **Bitbucket → Personal settings → OAuth**
2. Click **Add consumer**

| Setting | Value |
|---------|-------|
| Name | `FeatureSignals AI Janitor` |
| Callback URL | `https://app.featuresignals.com/api/v1/janitor/oauth/bitbucket/callback` |
| Permissions | `Repository: Write`, `Pull request: Write` |

3. Note the **Key** and **Secret**
4. Configure in FeatureSignals settings

## Troubleshooting

### Token Expired
If your token expires, reconnect via Settings → Integrations. The Janitor will show a warning banner.

### Repository Not Found
Ensure the token has access to the repository. For organization repos, the token must be granted organization access.

### Insufficient Permissions
The Janitor needs **write** access to create branches and PRs. If using a read-only token, connect via OAuth instead.