
# Plán: Přidat logování pro create, update, publish a unpublish akce

## Přehled

Přidáme audit log záznamy pro všechny klíčové akce s reporty:
- **Create** - při vytvoření nového reportu
- **Update** - při úpravě nastavení reportu
- **Publish** - při publikování reportu
- **Unpublish** - při odpublikování reportu

---

## Implementace

### 1. Helper funkce pro logování

Vytvořím utilitu `src/lib/auditLog.ts`:

```typescript
import { supabase } from "@/integrations/supabase/client";

export const logReportAction = async (
  reportId: string,
  actionType: "create" | "update" | "publish" | "unpublish",
  details?: Record<string, unknown>
) => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) return;

  await supabase.from("audit_log").insert({
    report_id: reportId,
    user_id: session.session.user.id,
    action_type: actionType,
    details: details || null,
  });
};
```

---

### 2. Úprava CreateReportDialog.tsx

Po úspěšném vytvoření reportu (po řádku 241):

```typescript
// Po: const { data: report, error: reportError } = await supabase...
if (reportError) throw reportError;

// Přidat:
await logReportAction(report.id, "create", {
  name: campaignName,
  type: reportType,
});
```

---

### 3. Úprava EditReportDialog.tsx

Po úspěšné aktualizaci (po řádku 109):

```typescript
if (error) throw error;

// Přidat:
await logReportAction(report.id, "update", {
  changes: ["name", "dates", "type", "project"].filter(Boolean),
});

toast.success("Report settings updated");
```

---

### 4. Úprava ReportDetail.tsx - handlePublish

Po úspěšném publish (po řádku 111):

```typescript
if (error) throw error;

// Přidat:
await logReportAction(reportId!, "publish");

toast.success("Report published successfully");
```

---

### 5. Úprava ReportDetail.tsx - handleUnpublish

Po úspěšném unpublish (po řádku 125):

```typescript
if (error) throw error;

// Přidat:
await logReportAction(reportId!, "unpublish");

toast.success("Report unpublished successfully");
```

---

## Výsledek v Activity Log

| Akce | Zobrazení | Detail |
|------|-----------|--------|
| Create | "Created" | "Created report" |
| Update | "Updated" | "Updated report settings" |
| Publish | "Published" | "Published report" |
| Unpublish | "Unpublished" | "Unpublished report" |

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/lib/auditLog.ts` | Vytvořit - helper funkce |
| `src/components/reports/CreateReportDialog.tsx` | Přidat logování create |
| `src/components/reports/EditReportDialog.tsx` | Přidat logování update |
| `src/pages/ReportDetail.tsx` | Přidat logování publish/unpublish |

---

## Bonus: Aktualizace contributors

Po přidání logu také zavoláme `fetchContributors()` v `ReportDetail.tsx`, aby se aktualizovali contributors po publish/unpublish akcích.
