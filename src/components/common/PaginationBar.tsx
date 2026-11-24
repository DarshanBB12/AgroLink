import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Pagination } from "@/types/api";

export const PaginationBar = ({ pagination, onPage }: { pagination?: Pagination; onPage: (page: number) => void }) => {
  const { t } = useLanguage();
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => onPage(pagination.page - 1)} aria-label={t("app.common.previous")}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">{t("app.common.pageOf", { page: pagination.page, total: pagination.totalPages })}</span>
      <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)} aria-label={t("app.common.next")}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
};
