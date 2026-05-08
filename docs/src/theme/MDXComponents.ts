import React from 'react';
// Import the original MDXComponents from Docusaurus
import MDXComponents from '@theme-original/MDXComponents';
import TargetingRuleDemo from '@site/src/components/TargetingRuleDemo';
import RolloutSimulator from '@site/src/components/RolloutSimulator';
import TryItSnippet from '@site/src/components/TryItSnippet';

/**
 * Extend the default Docusaurus MDX components so that interactive demos
 * are available in all MDX files without explicit imports.
 *
 * Usage in any .mdx file:
 *   <TargetingRuleDemo />
 *   <RolloutSimulator />
 *   <TryItSnippet />
 *   <TryItSnippet defaultFlagKey="my-flag" baseUrl="https://api.featuresignals.com" showRun={false} />
 */
export default {
  ...MDXComponents,
  TargetingRuleDemo,
  RolloutSimulator,
  TryItSnippet,
};
