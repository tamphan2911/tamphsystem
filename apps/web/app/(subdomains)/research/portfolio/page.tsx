import { BriefcaseBusiness } from "lucide-react";
import { HubConstructionPage } from "../components/HubConstructionPage";

export default function PortfolioConstructionPage() {
  return (
    <HubConstructionPage
      eyebrow="Portfolio hub loading"
      title="Portfolio is in the lab, getting dressed like it has a keynote at midnight."
      message="The portfolio hub is still under construction. Projects, work stories, research flex, and the clean public profile are being tuned before they hit the street."
      punchline="Come back later. The elevator music is temporary; the entrance will be sharp."
      accent="blue"
      icon={BriefcaseBusiness}
    />
  );
}
