
# Plán: Editovatelné texty v Summary & Takeaways

## Změny

### 1. Odstranění linky pod headline
Odstraníme `border-b border-border pb-2` z `<h2>` tagu:
```tsx
// Před
<h2 className="text-xl font-bold mb-4 border-b border-border pb-2">

// Po
<h2 className="text-xl font-bold mb-4">
```

### 2. Přidání editovatelných seznamů

Vytvoříme novou komponentu `EditableListSection` pro editaci seznamu položek:
- Zobrazí seznam s bullet pointy v read-only módu
- Při editaci zobrazí Textarea (každá položka na novém řádku)
- Tlačítko ceruzky pro zahájení editace (viditelné při hoveru)
- Save/Cancel tlačítka pro uložení změn

### 3. Nové state proměnné
```typescript
const [worksItems, setWorksItems] = useState(insights.recommendations?.works || []);
const [doesntWorkItems, setDoesntWorkItems] = useState(insights.recommendations?.doesnt_work || []);
const [suggestionsItems, setSuggestionsItems] = useState(insights.recommendations?.suggestions || []);
```

### 4. Rozšíření handleSaveSection
Přidat case pro:
- `recommendations_works`
- `recommendations_doesnt_work`
- `recommendations_suggestions`

### 5. Výsledná struktura dlaždic
Každá dlaždice bude mít:
- Headline (statický)
- EditableListSection komponenta pro seznam položek
- Při editaci: Textarea kde každá položka = jeden řádek
- Při uložení: split podle `\n` pro získání pole položek

## Soubory ke změně

| Soubor | Změny |
|--------|-------|
| `src/components/reports/AIInsightsContent.tsx` | Nová EditableListSection komponenta, state pro recommendations, odstranění border z headline |

## Technické detaily

### EditableListSection komponenta
```typescript
interface EditableListSectionProps {
  items: string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (items: string[]) => void;
  onCancel: () => void;
  canEdit?: boolean;
  bulletColor?: string;
  placeholder?: string;
}
```

Při editaci:
- Textarea s hodnotou `items.join('\n')`
- Při uložení: `value.split('\n').filter(line => line.trim())`
