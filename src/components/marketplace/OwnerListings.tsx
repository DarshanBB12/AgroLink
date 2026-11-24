import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, GridSkeleton } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { deleteListing, myListings } from "@/services/marketplace";
import type { Listing } from "@/types/api";
import { ListingCard } from "./ListingCard";
import { ListingFormDialog } from "./ListingFormDialog";

type Kind = "equipment" | "seed" | "fertilizer";

// "My listings" grid with add / edit / delete for one kind of owner-managed listing.
export const OwnerListings = ({ kind }: { kind: Kind }) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Listing | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const query = useQuery({ queryKey: ["my-listings", kind], queryFn: () => myListings(kind) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-listings", kind] });
  const del = useMutation({
    mutationFn: (l: Listing) => deleteListing(kind, l.id),
    onSuccess: () => { toast.success(t("app.form.deleted")); void refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setAdding(true)} className="gap-2 agro-btn"><Plus className="h-4 w-4" />{t(`app.form.add.${kind}`)}</Button></div>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        : !query.data ? <GridSkeleton count={4} />
        : query.data.data.length === 0 ? <EmptyState title={t(`app.form.empty.${kind}`)} hint={t("app.form.emptyHint")} action={<Button onClick={() => setAdding(true)}>{t(`app.form.add.${kind}`)}</Button>} />
        : <div className="agro-grid">{query.data.data.map((l) => (
            <ListingCard key={l.id} listing={l} onOpen={setEditing} actionLabel={t("app.common.edit")} onAction={setEditing} secondaryAction={{ label: t("app.common.delete"), variant: "destructive", onClick: setDeleting }} />
          ))}</div>}
      <ListingFormDialog kind={kind} open={adding || Boolean(editing)} listing={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => void refresh()} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} title={t("app.form.deleteTitle")} description={t("app.form.deleteHint", { name: deleting?.name || "" })} destructive onConfirm={() => { if (deleting) del.mutate(deleting); setDeleting(null); }} />
    </div>
  );
};
