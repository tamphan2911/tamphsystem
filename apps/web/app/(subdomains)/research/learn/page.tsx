import { GraduationCap } from "lucide-react";
import { HubConstructionPage } from "@/sites/research/components/HubConstructionPage";

export default function LearnConstructionPage() {
  return (
    <HubConstructionPage
      eyebrow="Learn hub warming up"
      title="Learn hub is under construction."
      message="Courses, practice flows, and the student dashboard are being upgraded before the learning hub opens properly."
      punchline="Come back later. The lesson engine is getting a cleaner launch."
      accent="emerald"
      icon={GraduationCap}
    />
  );
}
