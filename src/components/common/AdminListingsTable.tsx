import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchInput } from "@/components/common/AdminFilters";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, RowsSkeleton, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import api, { getErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { searchListings } from "@/services/marketplace";
import { deleteListing } from "@/services/marketplace";
import type { Listing } from "@/types/api";

// Admin view of every equipment or worker listing with real moderation actions.
export const AdminListingsTable = ({ type }: { type: "equipment" | "worker" }) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ l: Listing; action: "delete" | "deactivate" } | null>(null);
  const params = { q, page, limit: 15, sort: "newest" };
  const query = useQuery({ queryKey: ["admin-listings", type, params], queryFn: () => searchListings(type, params), placeholderData: keepPreviousData });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-listings"] });
  const fail = (e: unknown) => toast.error(getErrorMessage(e));
  const toggle = useMutation({ mutationFn: (l: Listing) => api.put(`/equipment/${l.id}`, { available: !l.available }), onSuccess: () => { toast.success(t("app.admin.listingUpdated")); void refresh(); }, onError: fail });
  const del = useMutation({ mutationFn: (l: Listing) => deleteListing("equipment", l.id), onSuccess: () => { toast.success(t("app.form.deleted")); void refresh(); }, onError: fail });
  const deactivate = useMutation({ mutationFn: (l: Listing) => api.put(`/admin/users/${l.owner?.id}`, { isActive: false }), onSuccess: () => { toast.success(t("app.admin.userUpdated")); void refresh(); }, onError: fail });

  return (
    <div className="space-y-4">
      <div className="flex"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t(type === "equipment" ? "app.admin.searchEquipment" : "app.admin.searchWorkers")} /></div>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !query.data ? <RowsSkeleton /> : query.data.data.length === 0 ? <EmptyState title={t("app.search.noResults")} /> : (
        <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.name")}</th><th className="p-3">{t(type === "equipment" ? "app.table.owner" : "app.card.skills")}</th><th className="p-3">{t("app.table.location")}</th><th className="p-3">{t("app.table.price")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3 text-right">{t("app.table.actions")}</th></tr></thead>
          <tbody>{query.data.data.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="p-3 font-medium">{l.name}<p className="text-xs font-normal text-muted-foreground">{l.category}</p></td>
              <td className="p-3">{type === "equipment" ? l.owner?.name : (l.details.skills || []).join(", ")}</td>
              <td className="p-3">{l.location || "—"}</td>
              <td className="p-3">{formatINR(l.price)} / {t(`app.units.${l.priceUnit}`)}</td>
              <td className="p-3"><StatusBadge status={l.available ? "active" : "cancelled"} label={l.available ? t("app.status.available") : t("app.status.unavailable")} /></td>
              <td className="p-3 text-right"><div className="flex justify-end gap-2">
                {type === "equipment" ? <><Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(l)}>{l.available ? t("app.admin.unlist") : t("app.admin.relist")}</Button><Button size="sm" variant="destructive" onClick={() => setTarget({ l, action: "delete" })}>{t("app.common.delete")}</Button></>
                  : <Button size="sm" variant="destructive" onClick={() => setTarget({ l, action: "deactivate" })}>{t("app.admin.deactivate")}</Button>}
              </div></td>
            </tr>))}</tbody></table></div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      <ConfirmDialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)} destructive title={target?.action === "delete" ? t("app.form.deleteTitle") : t("app.admin.deactivateTitle")} description={t(target?.action === "delete" ? "app.form.deleteHint" : "app.admin.toggleHint", { name: target?.l.name || "" })}
        onConfirm={() => { if (target) (target.action === "delete" ? del : deactivate).mutate(target.l); setTarget(null); }} />
    </div>
  );
};
