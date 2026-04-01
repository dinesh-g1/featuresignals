import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/installation',
        'getting-started/create-your-first-flag',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/feature-flags',
        'core-concepts/projects-and-environments',
        'core-concepts/targeting-and-segments',
        'core-concepts/percentage-rollouts',
        'core-concepts/ab-experimentation',
        'core-concepts/mutual-exclusion',
        'core-concepts/prerequisites',
        'core-concepts/flag-lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'Dashboard',
      items: [
        'dashboard/overview',
        'dashboard/managing-flags',
        'dashboard/evaluation-metrics',
        'dashboard/flag-health',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/relay-proxy',
        'advanced/scheduling',
        'advanced/kill-switch',
        'advanced/approval-workflows',
        'advanced/webhooks',
        'advanced/audit-logging',
        'advanced/rbac',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/evaluation-engine',
        'architecture/real-time-updates',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker-compose',
        'deployment/self-hosting',
        'deployment/configuration',
      ],
    },
  ],
  api: [
    'api-reference/overview',
    'api-reference/authentication',
    'api-reference/projects',
    'api-reference/environments',
    'api-reference/flags',
    'api-reference/flag-state',
    'api-reference/evaluation',
    'api-reference/segments',
    'api-reference/api-keys',
    'api-reference/team-management',
    'api-reference/approvals',
    'api-reference/webhooks',
    'api-reference/audit-log',
    'api-reference/metrics',
  ],
  sdks: [
    'sdks/overview',
    'sdks/go',
    'sdks/nodejs',
    'sdks/python',
    'sdks/java',
    'sdks/react',
    'sdks/openfeature',
  ],
};

export default sidebars;
