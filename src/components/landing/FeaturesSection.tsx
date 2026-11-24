import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tractor, Users, Calendar, CreditCard, MessageCircle, Cloud, Star, Bell } from "lucide-react";

const features = [
  { icon: Tractor, key: "f1" },
  { icon: Users, key: "f2" },
  { icon: Calendar, key: "f3" },
  { icon: CreditCard, key: "f4" },
  { icon: MessageCircle, key: "f5" },
  { icon: Cloud, key: "f6" },
  { icon: Star, key: "f7" },
  { icon: Bell, key: "f8" },
];

const FeaturesSection = () => {
  const { t } = useLanguage();
  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t("app.landing.featuresTag")}</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4 text-foreground">
            {t("app.landing.featuresTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("app.landing.featuresSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-xl p-6 border hover:shadow-lg hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t(`app.landing.${f.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`app.landing.${f.key}.desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
