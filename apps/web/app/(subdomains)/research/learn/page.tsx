import { GraduationCap } from "lucide-react";
import { HubConstructionPage } from "../components/HubConstructionPage";

export default function LearnConstructionPage() {
  return (
    <HubConstructionPage
      eyebrow="Learn hub warming up"
      title="Learn is cooking lessons, quizzes, and study sauce in the back room."
      message="The learning hub is currently under construction. Courses, practice flows, and the student dashboard are being upgraded before the doors open properly."
      punchline="Come back later. Class is not dismissed; it is just getting a better soundtrack."
      accent="emerald"
      icon={GraduationCap}
    />
  );
}
