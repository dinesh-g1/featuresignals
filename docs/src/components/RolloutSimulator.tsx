'use client';

import React, { useState, useMemo, useCallback } from 'react';

// ── Hashing (MurmurHash3-inspired 32-bit hash) ──────────────────────────
// We use a simple but effective hash for demo purposes. In production,
// FeatureSignals uses MurmurHash3-128 for deterministic bucket assignment.

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned 32-bit
}

function getBucket(flagKey: string, userKey: string): number {
  const input = `${flagKey}.${userKey}`;
  const hash = hashString(input);
  // Map to 0–9999 (basis points)
  return hash % 10000;
}

// ── Preset Users ─────────────────────────────────────────────────────────

interface PresetUser {
  name: string;
  key: string;
}

const PRESET_USERS: PresetUser[] = [
  { name: 'Alice (US)', key: 'alice@acme.com' },
  { name: 'Bob (EU)', key: 'bob@example.de' },
  { name: 'Carol (Startup)', key: 'carol@startup.io' },
  { name: 'Dave (Enterprise)', key: 'dave@bigco.com' },
  { name: 'Eve (Freelancer)', key: 'eve@freelance.dev' },
];

// ── Component ────────────────────────────────────────────────────────────

export default function RolloutSimulator(): React.ReactElement {
  const [percentage, setPercentage] = useState(50);
  const [flagKey, setFlagKey] = useState('new-checkout');
  const [userKey, setUserKey] = useState('alice@acme.com');
  const [step, setStep] = useState(0);

  // Recalculate on any input change
  const bucket = useMemo(() => getBucket(flagKey, userKey), [flagKey, userKey]);
  const hashInput = `${flagKey}.${userKey}`;
  const hashVal = useMemo(() => hashString(hashInput), [flagKey, userKey]);
  const threshold = percentage * 100; // basis points
  const isIncluded = bucket < threshold;

  const handlePercentageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPercentage(Number(e.target.value));
  }, []);

  const selectUser = useCallback((key: string) => {
    setUserKey(key);
  }, []);

  // Compute user statuses for the "overview" tiles
  const userResults = useMemo(
    () =>
      PRESET_USERS.map((u) => ({
        ...u,
        bucket: getBucket(flagKey, u.key),
        included: getBucket(flagKey, u.key) < threshold,
      })),
    [flagKey, threshold],
  );

  return (
    <div className="fs-demo" data-demo="rollout">
      {/* Header */}
      <div className="fs-demo-header">
        <span className="fs-demo-badge">Interactive Demo</span>
        <h3>Percentage Rollout Simulator</h3>
        <p>
          See how consistent hashing deterministically assigns users to rollout buckets.
          The same user + flag combination always maps to the same bucket.
        </p>
      </div>

      <div className="fs-demo-grid fs-demo-grid--wide-right">
        {/* Left: Controls */}
        <div className="fs-demo-panel">
          <h4 className="fs-demo-panel-title">Configuration</h4>

          {/* Flag Key */}
          <div className="fs-rs-field">
            <label className="fs-rs-label" htmlFor="rs-flagKey">Flag Key</label>
            <input
              id="rs-flagKey"
              className="fs-rs-input"
              type="text"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
            />
          </div>

          {/* User Key */}
          <div className="fs-rs-field">
            <label className="fs-rs-label" htmlFor="rs-userKey">User Key</label>
            <input
              id="rs-userKey"
              className="fs-rs-input"
              type="text"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
            />
            <div className="fs-rs-preset-users">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.key}
                  className={`fs-rs-user-chip ${userKey === u.key ? 'fs-rs-user-chip--active' : ''}`}
                  onClick={() => selectUser(u.key)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Percentage Slider */}
          <div className="fs-rs-field">
            <label className="fs-rs-label" htmlFor="rs-percentage">
              Rollout Percentage: <strong>{percentage}%</strong>
            </label>
            <div className="fs-rs-slider-row">
              <span className="fs-rs-slider-label">0%</span>
              <input
                id="rs-percentage"
                className="fs-rs-slider"
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={handlePercentageChange}
              />
              <span className="fs-rs-slider-label">100%</span>
            </div>
          </div>

          {/* Visual Rollout Bar */}
          <div className="fs-rs-field">
            <label className="fs-rs-label">Rollout Visualization</label>
            <div className="fs-rs-bar">
              <div
                className="fs-rs-bar-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="fs-rs-bar-legend">
              <span>🟢 <strong>{percentage}%</strong> get the flag</span>
              <span>🔘 <strong>{100 - percentage}%</strong> don&apos;t</span>
            </div>
          </div>

          {/* User Overview */}
          <div className="fs-rs-field">
            <label className="fs-rs-label">All Users at {percentage}% Rollout</label>
            <div className="fs-rs-user-grid">
              {userResults.map((u) => (
                <div
                  key={u.key}
                  className={`fs-rs-user-card ${u.included ? 'fs-rs-user-card--on' : 'fs-rs-user-card--off'}`}
                  onClick={() => selectUser(u.key)}
                >
                  <div className="fs-rs-user-card-name">{u.name}</div>
                  <div className="fs-rs-user-card-bucket">Bucket {u.bucket}</div>
                  <div className="fs-rs-user-card-status">
                    {u.included ? '✅ Gets flag' : '❌ No flag'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Step-by-step Walkthrough */}
        <div className="fs-demo-panel">
          <h4 className="fs-demo-panel-title">Step-by-Step Walkthrough</h4>
          <p className="fs-rs-walkthrough-intro">
            Click each step to see how FeatureSignals determines whether <strong>{userKey}</strong> gets the{' '}
            <code>{flagKey}</code> flag at <strong>{percentage}%</strong> rollout.
          </p>

          <div className="fs-rs-steps">
            {/* Step 1 */}
            <button
              className={`fs-rs-step ${step === 0 ? 'fs-rs-step--active' : ''}`}
              onClick={() => setStep(0)}
            >
              <span className="fs-rs-step-num">1</span>
              <span className="fs-rs-step-title">Build the hash input</span>
            </button>
            {step === 0 && (
              <div className="fs-rs-step-detail">
                <p>
                  The engine concatenates the <strong>flag key</strong> and <strong>user key</strong> with a dot separator
                  to create a unique input for hashing:
                </p>
                <pre className="fs-rs-code"><code>"{flagKey}" + "." + "{userKey}"</code></pre>
                <p className="fs-rs-result">→ <code>&quot;{hashInput}&quot;</code></p>
              </div>
            )}

            {/* Step 2 */}
            <button
              className={`fs-rs-step ${step === 1 ? 'fs-rs-step--active' : ''}`}
              onClick={() => setStep(1)}
            >
              <span className="fs-rs-step-num">2</span>
              <span className="fs-rs-step-title">Hash with MurmurHash3</span>
            </button>
            {step === 1 && (
              <div className="fs-rs-step-detail">
                <p>
                  The combined string is hashed using <strong>MurmurHash3</strong>, producing a 32-bit unsigned integer.
                  MurmurHash3 is fast, non-cryptographic, and provides excellent uniform distribution.
                </p>
                <pre className="fs-rs-code"><code>MurmurHash3("{hashInput}")</code></pre>
                <p className="fs-rs-result">→ <code>{hashVal} (0x{hashVal.toString(16).padStart(8, '0')})</code></p>
              </div>
            )}

            {/* Step 3 */}
            <button
              className={`fs-rs-step ${step === 2 ? 'fs-rs-step--active' : ''}`}
              onClick={() => setStep(2)}
            >
              <span className="fs-rs-step-num">3</span>
              <span className="fs-rs-step-title">Map to basis points (0–9999)</span>
            </button>
            {step === 2 && (
              <div className="fs-rs-step-detail">
                <p>
                  The hash is reduced modulo <strong>10,000</strong> to map it into the basis point range.
                  This gives 0.01% granularity.
                </p>
                <pre className="fs-rs-code"><code>{hashVal} % 10000</code></pre>
                <p className="fs-rs-result">→ Bucket <code>{bucket}</code> ({(bucket / 100).toFixed(2)}%)</p>
              </div>
            )}

            {/* Step 4 */}
            <button
              className={`fs-rs-step ${step === 3 ? 'fs-rs-step--active' : ''}`}
              onClick={() => setStep(3)}
            >
              <span className="fs-rs-step-num">4</span>
              <span className="fs-rs-step-title">Compare against rollout threshold</span>
            </button>
            {step === 3 && (
              <div className="fs-rs-step-detail">
                <p>
                  The user&apos;s bucket (<code>{bucket}</code>) is compared to the rollout threshold
                  (<code>{threshold}</code> basis points = {percentage}%).
                  If the bucket is <strong>less than</strong> the threshold, the user gets the flag.
                </p>
                <pre className="fs-rs-code"><code>if bucket &lt; threshold {"{"}</code></pre>
                <pre className="fs-rs-code"><code>  return ROLLOUT (flag value)</code></pre>
                <pre className="fs-rs-code"><code>{"}"} else {"{"}</code></pre>
                <pre className="fs-rs-code"><code>  return FALLTHROUGH (default value)</code></pre>
                <pre className="fs-rs-code"><code>{"}"}</code></pre>
                <p className="fs-rs-result">
                  → <code>{bucket}</code> {'<'} <code>{threshold}</code> →{' '}
                  <strong>{bucket < threshold ? '✅ ROLLOUT — gets the flag!' : '❌ FALLTHROUGH — uses default value'}</strong>
                </p>
              </div>
            )}

            {/* Step 5 */}
            <button
              className={`fs-rs-step ${step === 4 ? 'fs-rs-step--active' : ''}`}
              onClick={() => setStep(4)}
            >
              <span className="fs-rs-step-num">5</span>
              <span className="fs-rs-step-title">Deterministic guarantee</span>
            </button>
            {step === 4 && (
              <div className="fs-rs-step-detail">
                <p>
                  Because the hash is <strong>deterministic</strong>, the same <code>{userKey}</code> +{' '}
                  <code>{flagKey}</code> will <em>always</em> map to bucket <code>{bucket}</code>.
                </p>
                <ul className="fs-rs-guarantees">
                  <li>
                    <strong>Consistency:</strong> {userKey} always gets the same result for <code>{flagKey}</code>
                  </li>
                  <li>
                    <strong>Uniform distribution:</strong> Users are evenly spread across all 10,000 buckets
                  </li>
                  <li>
                    <strong>Cross-flag independence:</strong> Each flag uses its own key, so{' '}
                    <code>{userKey}</code> is at different percentiles for different flags
                  </li>
                  <li>
                    <strong>Stickiness:</strong> Increasing the percentage only adds new users —{' '}
                    {isIncluded
                      ? `${userKey} won't lose the flag if you increase the percentage further`
                      : `${userKey} will only get the flag if you increase to above ${((bucket + 1) / 100).toFixed(2)}%`}
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Final Verdict */}
          <div className={`fs-rs-verdict ${isIncluded ? 'fs-rs-verdict--on' : 'fs-rs-verdict--off'}`}>
            <div className="fs-rs-verdict-badge">
              {isIncluded ? '✅ GETS THE FEATURE' : '❌ DOES NOT GET THE FEATURE'}
            </div>
            <div className="fs-rs-verdict-detail">
              User <code>{userKey}</code> → hash <code>0.{String(bucket).padStart(4, '0')}</code> →
              falls in the <strong>{isIncluded ? `${percentage}%` : `${100 - percentage}%`}</strong> bucket →
              {isIncluded ? ' gets the new feature' : ' uses the default'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
