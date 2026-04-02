import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'FeatureSignals',
  tagline: 'Open-source feature flag management for modern teams',
  favicon: 'img/favicon.ico',

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
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'api',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sdks',
          position: 'left',
          label: 'SDKs',
        },
        {
          href: 'https://github.com/dinesh-g1/featuresignals',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
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
