import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://featuresignals.com';

  const routes: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/use-cases', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/blog', changeFrequency: 'daily', priority: 0.8 },
    { path: '/changelog', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/security', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/status', changeFrequency: 'daily', priority: 0.6 },
    { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms-and-conditions', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/cancellation-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/shipping-policy', changeFrequency: 'yearly', priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
