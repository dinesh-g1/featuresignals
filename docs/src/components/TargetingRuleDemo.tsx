'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────

type Attribute = 'email' | 'country' | 'plan' | 'custom';
type Operator = 'eq' | 'neq' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'gt' | 'gte' | 'lt' | 'lte' | 'regex' | 'exists';

interface Condition {
  attribute: string;
  operator: Operator;
  values: string[];
}

interface TargetingRule {
  priority: number;
  description: string;
  match_type: 'all' | 'any';
  conditions: Condition[];
  value: boolean;
  percentage: number;
}

interface EvalContext {
  key: string;
  attributes: Record<string, string>;
}

// ── Constants ────────────────────────────────────────────────────────────

const ATTRIBUTE_OPTIONS: { value: Attribute; label: string; placeholder: string }[] = [
  { value: 'email', label: 'Email', placeholder: 'user@example.com' },
  { value: 'country', label: 'Country', placeholder: 'US' },
  { value: 'plan', label: 'Plan', placeholder: 'enterprise' },
  { value: 'custom', label: 'Custom Attribute', placeholder: 'attribute_name' },
];

const OPERATOR_OPTIONS: { value: Operator; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'Equals', needsValue: true },
  { value: 'neq', label: 'Not Equals', needsValue: true },
  { value: 'contains', label: 'Contains', needsValue: true },
  { value: 'startsWith', label: 'Starts With', needsValue: true },
  { value: 'endsWith', label: 'Ends With', needsValue: true },
  { value: 'in', label: 'In (comma-separated)', needsValue: true },
  { value: 'notIn', label: 'Not In (comma-separated)', needsValue: true },
  { value: 'gt', label: 'Greater Than', needsValue: true },
  { value: 'gte', label: 'Greater Than or Equal', needsValue: true },
  { value: 'lt', label: 'Less Than', needsValue: true },
  { value: 'lte', label: 'Less Than or Equal', needsValue: true },
  { value: 'regex', label: 'Regex', needsValue: true },
  { value: 'exists', label: 'Exists', needsValue: false },
];

const PRESET_CONTEXTS: { name: string; context: EvalContext }[] = [
  {
    name: 'US Enterprise User',
    context: { key: 'user-123', attributes: { country: 'US', plan: 'enterprise', email: 'alice@acme.com', beta: 'true' } },
  },
  {
    name: 'EU Free User',
    context: { key: 'user-456', attributes: { country: 'DE', plan: 'free', email: 'bob@example.de', beta: 'false' } },
  },
  {
    name: 'US Free User',
    context: { key: 'user-789', attributes: { country: 'US', plan: 'free', email: 'carol@startup.io', beta: 'false' } },
  },
];

// ── Evaluation Logic ─────────────────────────────────────────────────────

function matchesCondition(condition: Condition, attributes: Record<string, string>): boolean {
  const attrValue = attributes[condition.attribute];
  if (attrValue === undefined && condition.operator !== 'exists') return false;

  const vals = condition.values;

  switch (condition.operator) {
    case 'eq':
      return attrValue === vals[0];
    case 'neq':
      return attrValue !== vals[0];
    case 'contains':
      return attrValue?.includes(vals[0]) ?? false;
    case 'startsWith':
      return attrValue?.startsWith(vals[0]) ?? false;
    case 'endsWith':
      return attrValue?.endsWith(vals[0]) ?? false;
    case 'in':
      return vals.some((v) => v.trim() === attrValue);
    case 'notIn':
      return !vals.some((v) => v.trim() === attrValue);
    case 'gt':
      return Number(attrValue) > Number(vals[0]);
    case 'gte':
      return Number(attrValue) >= Number(vals[0]);
    case 'lt':
      return Number(attrValue) < Number(vals[0]);
    case 'lte':
      return Number(attrValue) <= Number(vals[0]);
    case 'regex':
      try {
        return new RegExp(vals[0]).test(attrValue ?? '');
      } catch {
        return false;
      }
    case 'exists':
      return attributes[condition.attribute] !== undefined;
    default:
      return false;
  }
}

function evaluateRule(rule: TargetingRule, context: EvalContext): { matches: boolean; reason: string } {
  if (rule.conditions.length === 0) {
    return { matches: false, reason: 'No conditions defined' };
  }

  const results = rule.conditions.map((c) => ({
    condition: c,
    matches: matchesCondition(c, context.attributes),
  }));

  const allMatch = results.every((r) => r.matches);
  const anyMatch = results.some((r) => r.matches);

  const matched = rule.match_type === 'all' ? allMatch : anyMatch;

  if (matched) {
    const matchedConditions = results.filter((r) => r.matches).map((r) => r.condition);
    const details = matchedConditions
      .map((c) => `\`${c.attribute}\` ${c.operator === 'exists' ? 'exists' : `${c.operator} "${c.values.join(', ')}"`}`)
      .join(' AND ');
    return {
      matches: true,
      reason: `${rule.match_type === 'all' ? 'All' : 'At least one'} condition${rule.match_type === 'all' && matchedConditions.length > 1 ? 's' : ''} matched: ${details}`,
    };
  }

  const failedConditions = results.filter((r) => !r.matches).map((r) => r.condition);
  const failDetails = failedConditions
    .map((c) => `\`${c.attribute}\` ${c.operator === 'exists' ? 'missing' : `${c.operator} "${c.values.join(', ')}"`}`)
    .join(', ');
  return {
    matches: false,
    reason: `Failed conditions: ${failDetails}`,
  };
}

// ── Sub-Components ───────────────────────────────────────────────────────

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  condition: Condition;
  index: number;
  onChange: (index: number, c: Condition) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const operator = OPERATOR_OPTIONS.find((o) => o.value === condition.operator);
  const needsValue = operator?.needsValue ?? true;
  const isCustomAttr = !ATTRIBUTE_OPTIONS.slice(0, 4).some((a) => a.value === condition.attribute);

  return (
    <div className="fs-tr-condition">
      <span className="fs-tr-cond-label">#{index + 1}</span>
      <select
        className="fs-tr-select"
        value={condition.attribute}
        onChange={(e) => onChange(index, { ...condition, attribute: e.target.value })}
        aria-label={`Condition ${index + 1} attribute`}
      >
        {ATTRIBUTE_OPTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      {isCustomAttr && (
        <input
          className="fs-tr-input"
          type="text"
          placeholder="attribute_name"
          value={condition.attribute}
          onChange={(e) => onChange(index, { ...condition, attribute: e.target.value })}
          aria-label="Custom attribute name"
        />
      )}
      <select
        className="fs-tr-select"
        value={condition.operator}
        onChange={(e) => onChange(index, { ...condition, operator: e.target.value as Operator })}
        aria-label={`Condition ${index + 1} operator`}
      >
        {OPERATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {needsValue && (
        <input
          className="fs-tr-input"
          type="text"
          placeholder={ATTRIBUTE_OPTIONS.find((a) => a.value === condition.attribute)?.placeholder ?? 'value'}
          value={condition.values.join(', ')}
          onChange={(e) =>
            onChange(index, {
              ...condition,
              values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
            })
          }
          aria-label={`Condition ${index + 1} value`}
        />
      )}
      {canRemove && (
        <button
          className="fs-tr-btn-icon"
          onClick={() => onRemove(index)}
          aria-label={`Remove condition ${index + 1}`}
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function TargetingRuleDemo(): React.ReactElement {
  const [matchType, setMatchType] = useState<'all' | 'any'>('all');
  const [description, setDescription] = useState('Beta users in US');
  const [conditions, setConditions] = useState<Condition[]>([
    { attribute: 'country', operator: 'eq', values: ['US'] },
    { attribute: 'beta', operator: 'eq', values: ['true'] },
  ]);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [showJson, setShowJson] = useState(false);

  const currentContext = PRESET_CONTEXTS[selectedPreset].context;

  const rule: TargetingRule = useMemo(
    () => ({
      priority: 1,
      description,
      match_type: matchType,
      conditions,
      value: true,
      percentage: 10000,
    }),
    [description, matchType, conditions],
  );

  const evalResult = useMemo(() => evaluateRule(rule, currentContext), [rule, currentContext]);

  const addCondition = useCallback(() => {
    setConditions((prev) => [...prev, { attribute: 'country', operator: 'eq', values: [''] }]);
  }, []);

  const updateCondition = useCallback((index: number, updated: Condition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? updated : c)));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const jsonRule = useMemo(() => JSON.stringify({ rules: [rule] }, null, 2), [rule]);

  return (
    <div className="fs-demo" data-demo="targeting">
      {/* Header */}
      <div className="fs-demo-header">
        <span className="fs-demo-badge">Interactive Demo</span>
        <h3>Targeting Rule Builder</h3>
        <p>Build a targeting rule and test it against a sample user context to see if the flag would be ON or OFF.</p>
      </div>

      <div className="fs-demo-grid">
        {/* Left: Rule Builder */}
        <div className="fs-demo-panel">
          <h4 className="fs-demo-panel-title">Rule Configuration</h4>

          {/* Match type */}
          <div className="fs-tr-field">
            <label className="fs-tr-label">Match Type</label>
            <div className="fs-tr-radio-group">
              <label className={`fs-tr-radio ${matchType === 'all' ? 'fs-tr-radio--active' : ''}`}>
                <input
                  type="radio"
                  name="matchType"
                  value="all"
                  checked={matchType === 'all'}
                  onChange={() => setMatchType('all')}
                />
                <span>ALL (AND)</span>
              </label>
              <label className={`fs-tr-radio ${matchType === 'any' ? 'fs-tr-radio--active' : ''}`}>
                <input
                  type="radio"
                  name="matchType"
                  value="any"
                  checked={matchType === 'any'}
                  onChange={() => setMatchType('any')}
                />
                <span>ANY (OR)</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="fs-tr-field">
            <label className="fs-tr-label" htmlFor="tr-desc">Description</label>
            <input
              id="tr-desc"
              className="fs-tr-input fs-tr-input--full"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Beta users in US"
            />
          </div>

          {/* Conditions */}
          <div className="fs-tr-field">
            <label className="fs-tr-label">Conditions</label>
            <div className="fs-tr-conditions">
              {conditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  condition={c}
                  index={i}
                  onChange={updateCondition}
                  onRemove={removeCondition}
                  canRemove={conditions.length > 1}
                />
              ))}
            </div>
            <button className="fs-tr-btn-add" onClick={addCondition}>
              + Add Condition
            </button>
          </div>

          {/* JSON toggle */}
          <button
            className="fs-tr-btn-json"
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? '▾ Hide' : '▸ Show'} JSON Rule
          </button>
          {showJson && (
            <pre className="fs-tr-json"><code>{jsonRule}</code></pre>
          )}
        </div>

        {/* Right: Evaluation */}
        <div className="fs-demo-panel">
          <h4 className="fs-demo-panel-title">Test Evaluation</h4>

          {/* Context selector */}
          <div className="fs-tr-field">
            <label className="fs-tr-label" htmlFor="tr-context">Sample User</label>
            <select
              id="tr-context"
              className="fs-tr-select fs-tr-select--full"
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(Number(e.target.value))}
            >
              {PRESET_CONTEXTS.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Context attributes */}
          <div className="fs-tr-context-attrs">
            <div className="fs-tr-label">Context Attributes</div>
            <div className="fs-tr-attr-chips">
              <span className="fs-tr-attr-chip">
                <strong>key:</strong> {currentContext.key}
              </span>
              {Object.entries(currentContext.attributes).map(([k, v]) => (
                <span key={k} className="fs-tr-attr-chip">
                  <strong>{k}:</strong> {v}
                </span>
              ))}
            </div>
          </div>

          {/* Evaluation result */}
          <div className={`fs-tr-result ${evalResult.matches ? 'fs-tr-result--on' : 'fs-tr-result--off'}`}>
            <div className="fs-tr-result-badge">
              {evalResult.matches ? '✅ FLAG ON' : '❌ FLAG OFF'}
            </div>
            <div className="fs-tr-result-reason">{evalResult.reason}</div>
          </div>

          {/* Condition-by-condition breakdown */}
          <div className="fs-tr-breakdown">
            <div className="fs-tr-label">Condition Breakdown</div>
            {rule.conditions.map((c, i) => {
              const matches = matchesCondition(c, currentContext.attributes);
              return (
                <div key={i} className={`fs-tr-breakdown-row ${matches ? 'fs-tr-breakdown-row--pass' : 'fs-tr-breakdown-row--fail'}`}>
                  <span className="fs-tr-breakdown-icon">{matches ? '✓' : '✗'}</span>
                  <span>
                    <code>{c.attribute}</code> {c.operator === 'exists' ? 'exists' : `${c.operator} "${c.values.join(', ')}"`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
