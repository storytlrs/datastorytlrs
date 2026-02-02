

# Plán: Odstranění webhook UI z nastavení reportů

## Přehled

Odstraním veškeré UI prvky pro ruční vkládání webhook URL z aplikace. Webhooky budou konfigurovány centrálně jako secrets/environment variables a nebudou přístupné v UI.

## Dotčené komponenty

| Soubor | Změna |
|--------|-------|
| `src/components/reports/EditReportDialog.tsx` | Odstranit sentiment webhook URL input a state |
| `src/components/reports/AIInsightsTab.tsx` | Odstranit celou "Legacy webhook nastavení" sekci |
| `src/components/reports/CreateContentDialog.tsx` | Upravit - použít centrální secret místo per-report URL |
| `src/components/reports/EditContentDialog.tsx` | Upravit - použít centrální secret místo per-report URL |

## Technické řešení

### 1. EditReportDialog - odstranit webhook field

**Odstraním:**
- State `sentimentWebhookUrl`
- Input pro Sentiment Webhook URL (řádky 191-204)
- Resetování state v useEffect (řádek 70)
- Ukládání do DB (řádek 106)

### 2. AIInsightsTab - odstranit legacy webhook UI

**Odstraním:**
- Celou Collapsible sekci pro "Legacy webhook nastavení" (řádky 444-481)
- Funkci `handleSaveWebhookUrl` (řádky 167-180)
- State `webhookUrl` a `isSettingsOpen`

### 3. Úprava volání webhooků

Pro sentiment analysis v CreateContentDialog a EditContentDialog:
- Namísto čtení `report.sentiment_webhook_url` z databáze
- Vytvořím nový Edge Function, který bude číst webhook URL z secrets
- Nebo zjednodušíme - pokud webhook není nakonfigurovaný jako secret, funkce se nevykoná

**Nová architektura:**
```text
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────┐
│  Create/Edit    │────>│  Edge Function       │────>│  n8n Webhook  │
│  Content        │     │  (reads from secret) │     │  (SENTIMENT)  │
└─────────────────┘     └──────────────────────┘     └───────────────┘
```

### 4. Přidání nového secretu

Bude potřeba přidat secret:
- `SENTIMENT_WEBHOOK_URL` - centrální URL pro všechny reporty

### 5. Úprava sentiment triggeru

Místo volání webhooku přímo z frontendu:
```typescript
// STARÉ - čte URL z DB, volá z frontendu
const { data: report } = await supabase
  .from("reports")
  .select("sentiment_webhook_url")
  .eq("id", reportId);

await fetch(report.sentiment_webhook_url, {...});
```

```typescript
// NOVÉ - volá edge function, která má přístup k secretu
await supabase.functions.invoke("trigger-sentiment-analysis", {
  body: { content_id, report_id }
});
```

---

## Shrnutí změn

| Typ změny | Detail |
|-----------|--------|
| UI odstranění | Webhook input z EditReportDialog |
| UI odstranění | Legacy webhook sekce z AIInsightsTab |
| Nový secret | `SENTIMENT_WEBHOOK_URL` |
| Nová edge function | `trigger-sentiment-analysis` |
| Refaktoring | CreateContentDialog, EditContentDialog - volání edge function |

## Poznámka k DB sloupcům

Sloupce `sentiment_webhook_url` a `ai_webhook_url` v tabulce `reports` zůstanou v DB (pro zpětnou kompatibilitu), ale nebudou již používány. V budoucnu je lze odstranit migrací.

