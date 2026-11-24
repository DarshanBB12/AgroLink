import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Farmer Free",
    price: "₹0",
    period: "/month",
    description: "Perfect for small farmers getting started",
    features: [
      "Browse all equipment listings",
      "Hire up to 3 workers/month",
      "Order fertilizers",
      "Basic rental tracking",
      "Export CSV (last 30 days)",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Farmer Pro",
    price: "₹299",
    period: "/month",
    description: "For active farmers who need more",
    features: [
      "Everything in Free",
      "Unlimited worker hires",
      "Priority equipment booking",
      "Full CSV export history",
      "Weather forecasts",
      "Dedicated support",
    ],
    cta: "Start Pro Trial",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Equipment Owner",
    price: "₹199",
    period: "/month",
    description: "List and manage your machinery",
    features: [
      "List up to 10 machines",
      "Real-time booking dashboard",
      "Earnings & payout tracking",
      "Damage fine management",
      "Owner analytics",
    ],
    cta: "List My Equipment",
    highlight: false,
  },
  {
    name: "Enterprise / Admin",
    price: "Custom",
    period: "",
    description: "For cooperatives and agri-businesses",
    features: [
      "Unlimited listings & users",
      "Full platform analytics",
      "CSV + PDF export",
      "Dedicated account manager",
      "API access",
      "SLA support",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-background to-emerald-50/70">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">Plans for Every Agri Business Stage</h2>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? "border-primary shadow-lg scale-[1.01]" : "border-border shadow-sm"}
            >
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-foreground">{plan.name}</h3>
                  {plan.badge && <Badge>{plan.badge}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>

                <div className="mt-5">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>

                <div className="space-y-2 mt-5 flex-1">
                  {plan.features.map((feature) => (
                    <p key={feature} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      {feature}
                    </p>
                  ))}
                </div>

                <Button className="mt-6" variant={plan.highlight ? "default" : "outline"}>{plan.cta}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
