import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'FeatureSignals',
  tagline: 'Open-source feature flag management for modern teams',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.featuresignals.com',
  baseUrl: '/',

  organizationName: 'featuresignals',
  projectName: 'featuresignals',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      '@scalar/docusaurus',
      {
        label: 'API Playground',
        route: '/api-playground',
        configuration: {
          spec: {
            url: '/openapi/featuresignals.json',
          },
          theme: 'default',
          hiddenClients: true,
          metaData: {
            title: 'FeatureSignals API Playground',
          },
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/dinesh-g1/featuresignals/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'FeatureSignals',
      logo: {
        alt: 'FeatureSignals Logo',
        src: 'img/logo.svg',
        width: 32,
        height: 32,
      },
      items: [
        {
          href: 'https://featuresignals.com',
          label: 'Website',
          position: 'left',
        },
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Integration Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sdks',
          position: 'left',
          label: 'SDKs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'api',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'compliance',
          position: 'left',
          label: 'Security & Compliance',
        },
        {
          href: 'https://github.com/dinesh-g1/featuresignals',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
        {
          href: 'https://app.featuresignals.com/login',
          label: 'Log in',
          position: 'right',
        },
        {
          href: 'https://app.featuresignals.com/register',
          label: 'Sign Up',
          position: 'right',
          className: 'navbar-signup-btn',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Product',
          items: [
            {label: 'Website', href: 'https://featuresignals.com'},
            {label: 'Features', href: 'https://featuresignals.com/features'},
            {label: 'Pricing', href: 'https://featuresignals.com/pricing'},
            {label: 'Blog', href: 'https://featuresignals.com/blog'},
            {label: 'Contact', href: 'https://featuresignals.com/contact'},
          ],
        },
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/getting-started/quickstart'},
            {label: 'Core Concepts', to: '/core-concepts/feature-flags'},
            {label: 'API Reference', to: '/api-reference/overview'},
          ],
        },
        {
          title: 'SDKs',
          items: [
            {label: 'Go', to: '/sdks/go'},
            {label: 'Node.js', to: '/sdks/nodejs'},
            {label: 'Python', to: '/sdks/python'},
            {label: 'Java', to: '/sdks/java'},
            {label: '.NET', to: '/sdks/dotnet'},
            {label: 'Ruby', to: '/sdks/ruby'},
            {label: 'React', to: '/sdks/react'},
            {label: 'Vue', to: '/sdks/vue'},
          ],
        },
        {
          title: 'Security & Compliance',
          items: [
            {label: 'Security Overview', to: '/compliance/security-overview'},
            {label: 'GDPR', to: '/compliance/privacy-policy'},
            {label: 'SOC 2', to: '/compliance/soc2/controls-matrix'},
            {label: 'HIPAA', to: '/compliance/hipaa'},
            {label: 'System Status', href: 'https://featuresignals.com/status'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'GitHub', href: 'https://github.com/dinesh-g1/featuresignals'},
            {label: 'License (Apache-2.0)', href: 'https://github.com/dinesh-g1/featuresignals/blob/main/LICENSE'},
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} FeatureSignals. Apache-2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'python', 'go', 'bash', 'json', 'yaml', 'toml', 'csharp', 'ruby'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
