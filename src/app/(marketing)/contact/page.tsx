import { PlaceholderPage } from "@/components/marketing/placeholder-page";

export const metadata = { title: "Contact", description: "Contact REZUSURE." };

export default function ContactPage() {
  return (
    <PlaceholderPage
      title="Questions, partnerships, or product feedback?"
      description="We are building Rezusure for people who want actionable feedback on the resume they send to employers. Reach out with product questions, collaboration ideas, or support requests and we will get back to you."
      eyebrow="Contact"
    />
  );
}
