
# Plán: Contributors a Activity Log v Reportu

## Přehled

Přidáme do záhlaví reportu dvě nové funkce:
1. **Contributors** - zobrazení uživatelů, kteří upravovali report (avatary s překryvem)
2. **Log tlačítko** - otevře boční panel se seznamem všech změn

---

## Vizuální náhled

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← All reports                                                               │
│                                                                              │
│  Report Name                                         [Publish] [Log] [⚙]    │
│                                                                              │
│  Influencer campaign • Published • 👤👤👤 3 contributors                     │
│  Jan 1, 2026 - Jan 31, 2026                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

Activity Log (Sheet panel):
┌─────────────────────────────────────┐
│  Activity Log                    ✕  │
├─────────────────────────────────────┤
│                                     │
│  ● Import                           │
│    Petr Němec                       │
│    Feb 1, 2026 at 10:33 PM          │
│    Imported 32 rows from...         │
│                                     │
│  ● Import                           │
│    Petr Němec                       │
│    Feb 1, 2026 at 10:29 PM          │
│    Imported 7 rows from...          │
│                                     │
└─────────────────────────────────────┘
```

---

## Data

### Existující tabulka `audit_log`

Tabulka už existuje a obsahuje:
- `id` - UUID záznamu
- `report_id` - ID reportu
- `user_id` - ID uživatele
- `action_type` - typ akce (např. "import")
- `details` - JSONB s detaily (file_name, rows_imported, atd.)
- `created_at` - datum a čas

### Query pro Contributors

```sql
SELECT DISTINCT al.user_id, p.full_name, p.email, p.avatar_url 
FROM audit_log al 
LEFT JOIN profiles p ON al.user_id = p.id 
WHERE al.report_id = ?
```

### Query pro Activity Log

```sql
SELECT al.*, p.full_name, p.email, p.avatar_url 
FROM audit_log al 
LEFT JOIN profiles p ON al.user_id = p.id 
WHERE al.report_id = ?
ORDER BY al.created_at DESC
```

---

## Komponenty

### 1. `ReportContributors.tsx`

Zobrazí překrývající se avatary contributorů:

```tsx
interface Contributor {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

// Avatary s překryvem (-ml-2 pro každý následující)
// Tooltip s jménem při hoveru
// Na konci "X contributors" text
```

### 2. `ReportActivityLog.tsx`

Sheet panel s historií změn:

```tsx
interface AuditLogEntry {
  id: string;
  action_type: string;
  details: {
    file_name?: string;
    rows_imported?: number;
    source?: string;
    // ...další pole
  };
  created_at: string;
  user: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Sheet z pravé strany
// ScrollArea pro dlouhé seznamy
// Formátování action_type na čitelný text
```

---

## Změny v `ReportDetail.tsx`

### Nové state a data fetching

```tsx
const [contributors, setContributors] = useState<Contributor[]>([]);
const [isLogOpen, setIsLogOpen] = useState(false);

// Fetch contributors při načtení reportu
const fetchContributors = async () => {
  const { data } = await supabase
    .from("audit_log")
    .select("user_id, profiles!inner(full_name, email, avatar_url)")
    .eq("report_id", reportId);
  // Deduplikace podle user_id
};
```

### Úprava header layoutu

```tsx
{/* Meta info row */}
<p className="text-muted-foreground flex items-center gap-2">
  {getReportTypeLabel(report.type)} •{" "}
  {report.status === "active" ? "Published" : report.status}
  {contributors.length > 0 && (
    <>
      <span className="mx-1">•</span>
      <ReportContributors contributors={contributors} />
    </>
  )}
</p>

{/* Buttons */}
<div className="flex items-center gap-2">
  {/* Publish/Unpublish buttons */}
  <Button variant="ghost" onClick={() => setIsLogOpen(true)}>
    <ClipboardList className="w-4 h-4 mr-2" />
    Log
  </Button>
  {/* Settings button */}
</div>

<ReportActivityLog 
  reportId={reportId!} 
  open={isLogOpen} 
  onOpenChange={setIsLogOpen} 
/>
```

---

## Formátování action_type

| action_type | Zobrazení | Popis v detailu |
|-------------|-----------|-----------------|
| `import` | Import | "Imported X rows from {file_name}" |
| `create` | Created | "Created report" |
| `update` | Updated | "Updated report settings" |
| `publish` | Published | "Published report" |
| `unpublish` | Unpublished | "Unpublished report" |

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/components/reports/ReportContributors.tsx` | Vytvořit - avatary contributorů |
| `src/components/reports/ReportActivityLog.tsx` | Vytvořit - sheet s historií |
| `src/pages/ReportDetail.tsx` | Upravit - přidat contributors a log tlačítko |

---

## Implementační kroky

1. **Vytvořit `ReportContributors.tsx`**
   - Komponenta s překrývajícími se avatary
   - Tooltip s jménem uživatele
   - Text "X contributors"

2. **Vytvořit `ReportActivityLog.tsx`**
   - Sheet panel z pravé strany
   - Fetch audit_log s profiles
   - Timeline zobrazení změn
   - Formátování action_type a details

3. **Upravit `ReportDetail.tsx`**
   - Přidat fetch contributors
   - Přidat Contributors do meta řádku
   - Přidat Log tlačítko do header buttons
   - Integrovat ActivityLog sheet
