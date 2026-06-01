import { BriefcaseBusiness } from "lucide-react";
import { HubConstructionPage } from "../components/HubConstructionPage";

export default function PortfolioConstructionPage() {
  return (
    <HubConstructionPage
      eyebrow="Portfolio hub loading"
      title="Portfolio hub is under construction."
      message="Projects, work stories, research highlights, and the public profile are being tuned before this section opens."
      punchline="Come back later. The entrance is being cleaned up."
      accent="blue"
      icon={BriefcaseBusiness}
    />
  );
}
