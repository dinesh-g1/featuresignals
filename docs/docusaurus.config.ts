import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const DOCS_SITE_URL = "https://docs.featuresignals.com";
const DASHBOARD_URL = "https://app.featuresignals.com";
const WEBSITE_URL = "https://featuresignals.com";

const config: Config = {
  title: "FeatureSignals",
  tagline:
    "The control plane for software delivery. Sub-millisecond latency. AI-driven cleanup.",
  favicon: "img/logo.svg",

  future: {
    v4: true,
  },

  url: DOCS_SITE_URL,
  baseUrl: "/",

  organizationName: "featuresignals",
  projectName: "featuresignals",

  onBrokenLinks: "warn",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  headTags: [
    {
      tagName: "meta",
      attributes: {
        property: "og:image",
        content: `${DOCS_SITE_URL}/img/logo.svg`,
      },
    },
  ],

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    [
      "@scalar/docusaurus",
      {
        label: "API Playground",
        route: "/api-playground",
        configuration: {
          spec: {
            url: "/openapi/featuresignals.json",
          },
          theme: "default",
          hiddenClients: true,
          metaData: {
            title: "FeatureSignals API Playground",
          },
        },
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          editUrl:
            "https://github.com/dinesh-g1/featuresignals/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {
        name: "keywords",
        content:
          "feature flags, feature flag management, feature toggles, A/B testing, open source, self-hosted, SDKs, API",
      },
    ],
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "FeatureSignals",
      logo: {
        alt: "FeatureSignals Logo",
        src: "img/logo.svg",
        width: 32,
        height: 32,
      },
      items: [
        {
          href: WEBSITE_URL,
          label: "Website",
          position: "left",
        },
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Integration Guide",
        },
        {
          type: "docSidebar",
          sidebarId: "sdks",
          position: "left",
          label: "SDKs",
        },
        {
          type: "docSidebar",
          sidebarId: "api",
          position: "left",
          label: "API Reference",
        },
        {
          type: "docSidebar",
          sidebarId: "compliance",
          position: "left",
          label: "Security & Compliance",
        },
        {
          href: "https://github.com/dinesh-g1/featuresignals",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
        {
          href: `${DASHBOARD_URL}/login`,
          label: "Log in",
          position: "right",
        },
        {
          href: `${DASHBOARD_URL}/register`,
          label: "Sign Up",
          position: "right",
          className: "navbar-signup-btn",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Product",
          items: [
            { label: "Website", href: WEBSITE_URL },
            { label: "Features", href: `${WEBSITE_URL}/features` },
            { label: "Pricing", href: `${WEBSITE_URL}/pricing` },
            { label: "Blog", href: `${WEBSITE_URL}/blog` },
            { label: "Docs Home", href: DOCS_SITE_URL },
            { label: "System Status", href: `${WEBSITE_URL}/status` },
          ],
        },
        {
          title: "Documentation",
          items: [
            { label: "Getting Started", to: "/getting-started/quickstart" },
            { label: "Core Concepts", to: "/core-concepts/feature-flags" },
            { label: "API Reference", to: "/api-reference/overview" },
          ],
        },
        {
          title: "SDKs",
          items: [
            { label: "Go", to: "/sdks/go" },
            { label: "Node.js", to: "/sdks/nodejs" },
            { label: "Python", to: "/sdks/python" },
            { label: "Java", to: "/sdks/java" },
            { label: ".NET", to: "/sdks/dotnet" },
            { label: "Ruby", to: "/sdks/ruby" },
            { label: "React", to: "/sdks/react" },
            { label: "Vue", to: "/sdks/vue" },
          ],
        },
        {
          title: "Security & Compliance",
          items: [
            { label: "Security Overview", to: "/compliance/security-overview" },
            { label: "GDPR", to: "/compliance/privacy-policy" },
            { label: "SOC 2", to: "/compliance/soc2/controls-matrix" },
            { label: "HIPAA", to: "/compliance/hipaa" },
            {
              label: "Changelog",
              href: "https://github.com/dinesh-g1/featuresignals/releases",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/dinesh-g1/featuresignals",
            },
            {
              label: "License (Apache-2.0)",
              href: "https://github.com/dinesh-g1/featuresignals/blob/main/LICENSE",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} FeatureSignals. Apache-2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        "java",
        "python",
        "go",
        "bash",
        "json",
        "yaml",
        "toml",
        "csharp",
        "ruby",
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
