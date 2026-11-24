import { motion } from "framer-motion";
import { ArrowRight, BarChart2, Search, ShieldCheck, UserCheck } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Sign Up & Choose Your Role",
    description: "Register as a Farmer, Farm Worker, or Equipment Owner.",
    icon: UserCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    step: "02",
    title: "Browse & Book",
    description: "Farmers browse available equipment, hire skilled workers, or order fertilizers. Workers list their skills and set availability. Equipment owners list their machinery.",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    step: "03",
    title: "Track & Manage",
    description: "All orders, hires, and rentals appear in your dashboard under 'My Orders & Rentals'. Track status, extend rentals, download CSV reports, and leave reviews.",
    icon: BarChart2,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    step: "04",
    title: "Admin Oversight",
    description: "Platform admins see every booking, user, and transaction in real time. Approve listings, resolve disputes, and export analytics across the platform.",
    icon: ShieldCheck,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-emerald-50 via-lime-50 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">From Signup to Harvest in 4 Steps</h2>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              <div className="h-full rounded-2xl border bg-card p-6 shadow-sm">
                <p className="text-5xl font-extrabold text-muted/50">{step.step}</p>
                <div className={`w-12 h-12 rounded-xl ${step.bg} ${step.color} flex items-center justify-center mt-4`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground mt-4">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 text-emerald-400">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
