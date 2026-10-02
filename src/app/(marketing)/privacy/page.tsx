import { PlaceholderPage } from "@/components/marketing/placeholder-page";

export const metadata = { title: "Privacy", description: "REZUSURE privacy information." };

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy is built into the product experience."
      description="Rezusure stores resumes and analysis data in a private workspace, uses server-side validation for account access, and keeps billing and account security protected behind authenticated infrastructure."
      eyebrow="Privacy"
    />
  );
}
