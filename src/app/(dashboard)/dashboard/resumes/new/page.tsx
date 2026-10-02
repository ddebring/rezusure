import ResumeAnalysisForm from "@/components/resumes/ResumeAnalysisForm";

export const metadata = { title: "New resume", robots: { index: false, follow: false } };

export default function NewResumePage() {
	return (
		<div className="mx-auto max-w-2xl">
			<ResumeAnalysisForm />
		</div>
	);
}
