import { MarketingDashboard } from "@/components/marketing-dashboard"

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingDashboard />
    </div>
  )
}

export const metadata = {
  title: "营销仪表板 | Marketing Dashboard",
  description: "Marketing performance analytics and campaign management dashboard.",
}