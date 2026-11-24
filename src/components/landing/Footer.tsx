import { Leaf } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  const columns = [
    { title: t("footer.product"), links: [t("footer.features"), t("footer.pricing"), t("footer.api")] },
    { title: t("footer.company"), links: [t("footer.about"), t("footer.blog"), t("footer.careers")] },
    { title: t("footer.support"), links: [t("footer.helpCenter"), t("footer.contact"), t("footer.privacy")] },
  ];

  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl mb-4">
              <Leaf className="h-6 w-6" />
              AgroLink
            </div>
            <p className="text-primary-foreground/60 text-sm">{t("footer.tagline")}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center text-primary-foreground/40 text-sm">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
