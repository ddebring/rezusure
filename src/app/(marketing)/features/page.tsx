import { SectionHeading } from "@/components/marketing/section-heading";
import { MarketingGrid } from "@/components/marketing/marketing-grid";

export const metadata = { title: "Features", description: "Explore REZUSURE's resume analysis and career optimization capabilities." };

export default function FeaturesPage() {
  return <main className="container-shell py-24"><SectionHeading eyebrow="Features" title="A clear diagnostic layer for your resume." description="The MVP focuses on structured analysis, actionable recommendations, and persistent history. More advanced career workflows can be added without changing the core domain model." /><MarketingGrid /></main>;
}
