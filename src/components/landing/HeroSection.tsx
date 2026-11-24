import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Users, Tractor, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero opacity-[0.07]" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              🌱 {t("hero.tagline")}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              {t("hero.title")}
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/signup">
                  {t("hero.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">{t("hero.ctaSecondary")}</a>
              </Button>
            </div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:grid grid-cols-2 gap-4"
          >
            {[
              { icon: Users, label: t("hero.stat1Label"), sub: t("hero.stat1Sub"), color: "bg-primary/10 text-primary" },
              { icon: Tractor, label: t("hero.stat2Label"), sub: t("hero.stat2Sub"), color: "bg-accent/10 text-accent-foreground" },
              { icon: BarChart3, label: t("hero.stat3Label"), sub: t("hero.stat3Sub"), color: "bg-info/10 text-info" },
              { icon: Users, label: t("hero.stat4Label"), sub: t("hero.stat4Sub"), color: "bg-warning/10 text-warning" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
