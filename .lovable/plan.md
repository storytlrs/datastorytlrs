

# Plán: Oprava jspdf bezpečnostní zranitelnosti

## Analýza

### Současný stav
| Balíček | Verze | Status |
|---------|-------|--------|
| jspdf | ^4.0.0 | ✅ Opravená verze |
| html2pdf.js | ^0.10.3 | ⚠️ Nepoužívaný, obsahuje zranitelný jspdf@3.0.4 |

### CVE-2025-68428
- **Postižené verze:** jspdf < 4.0.0
- **Typ:** Path Traversal / Local File Inclusion
- **CVSS skóre:** 9.2 (kritické)
- **Důležité:** Zranitelnost se týká **pouze Node.js buildů**. Browser buildy nejsou postiženy.

### Hodnocení rizika pro tento projekt
**Nízké riziko** - Projekt používá jspdf pouze v prohlížeči (React SPA), ne na serveru. I kdyby byla použita starší verze, zranitelnost by nebyla zneužitelná v kontextu prohlížeče.

---

## Řešení

### 1. Odstranit nepoužívaný balíček html2pdf.js

Balíček `html2pdf.js` není nikde v kódu importován ani používán. Přináší zranitelnou transitní závislost `jspdf@3.0.4`. Jeho odstraněním vyčistíme supply chain.

**Změna v package.json:**
```diff
- "html2pdf.js": "^0.10.3",
```

### 2. Aktualizovat security scan finding

Po úspěšné opravě odstraním odpovídající security finding.

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `package.json` | Odstranit html2pdf.js závislost |

---

## Výsledek

- Odstraněn nepoužívaný balíček
- Eliminována zranitelná transitní závislost jspdf@3.0.4
- Zachována funkčnost PDF exportu (používá přímo jspdf@4.0.0 + html2canvas)
- Čistší dependency tree

