import type { Metadata } from "next";
import { notFound } from "next/navigation";
import apiCategories from "@/data/api-endpoints";
import { ApiReferenceSection } from "@/components/api-reference-section";

interface Props {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return apiCategories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = apiCategories.find((c) => c.slug === category);

  if (!cat) {
    return { title: "Not Found" };
  }

  return {
    title: `${cat.name} API`,
    description: cat.description,
  };
}

export default async function ApiCategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = apiCategories.find((c) => c.slug === category);

  if (!cat) {
    notFound();
  }

  return <ApiReferenceSection category={cat} />;
}
