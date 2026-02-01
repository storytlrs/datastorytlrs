
Cíl
- Opravit PDF export tak, aby:
  1) Stránky PDF měly jednotné pozadí #E9E9E9 po celé ploše (ne jen uvnitř karet).
  2) Nevznikaly prázdné stránky (např. Page 9, 11).
  3) “Content Performance” karty se nelámaly “divně” (ideálně se vešly na jednu stránku; pokud bude obsah extrémně dlouhý, bude mít deterministické chování bez “rozbitých” okrajů).

Co je špatně teď (z přiloženého PDF)
1) Bílé pozadí stránky
- Do PDF se vkládá vykreslený obrázek (canvas) jen o velikosti exportovaného DOM obsahu. Okraje PDF (margin) jsou prázdné = bílá stránka.
- I když máme backgroundColor v html2canvas, ten se vztahuje na canvas plochu exportovaného elementu, ne na “zbytek stránky PDF” mimo vložený obrázek.

2) Prázdné stránky (Page 9, 11)
- V exportu používáme zároveň:
  - CSS break (.pdf-page-break { break-before: page; })
  - a zároveň html2pdf pagebreak.before: '.pdf-page-break'
- html2pdf pagebreak plugin tím může vložit “spacer” dvakrát, nebo posunout obsah tak, že vznikne extra prázdná stránka.
- Navíc Creator sekce občas výškově těsně přesahuje stránku (dlouhé texty, topic badges), takže plugin udělá “posun”, a výsledkem je “poloprázdná” pokračovací stránka s okrajem.

3) “Rozbíjení” layoutu v PDF
- Na PDF se používá stejný UI layout jako na webu (včetně interaktivních prvků), který není navržený pro pevný A4 landscape page box.
- Breakpointy (md: grid) + html2canvas “windowWidth” mohou způsobit jinou responsivní variantu, než očekáváme.

Navržené řešení (robustní)
Zavedeme samostatný “PDF render mód” a export budeme dělat z off-screen (skrytého) PDF layoutu, který:
- Má pevné rozměry A4 landscape (v CSS mm jednotkách).
- Každá “stránka” je wrapper, který má background #E9E9E9 a vlastní padding (a html2pdf margin nastavíme na 0).
- Zcela odstraníme dvojité triggerování pagebreaků (budeme používat jen CSS režim, bez pagebreak.before).
- V PDF módu skryjeme UI-only prvky (tlačítka, ikonky editace, “Select Content”, odkazy “Zobrazit obsah” apod.).
- Pro Content Performance dáme kompaktnější typografii/spacování + stabilní dvousloupcový layout.

Změny v kódu (konkrétní kroky)

1) src/index.css – přidat pevné “PDF page” styly
- Přidat třídy:
  - .pdf-page – pevný A4 landscape box v mm, background, padding, box-sizing, overflow hidden.
  - .pdf-mode – kompaktní typografie/spacování (menší fonty, menší gapy, menší paddingy).
  - .pdf-hide – display:none pro prvky, které nechceme v exportu.
  - Nastavit print-color-adjust pro zachování barev.

Příklad (koncept):
- .pdf-page { width: 297mm; min-height: 210mm; background:#E9E9E9; padding: 12mm; box-sizing:border-box; overflow:hidden; }
- .pdf-page + .pdf-page { break-before: page; }
- .pdf-mode * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

2) src/components/reports/AIInsightsTab.tsx – exportovat z “PDF render” containeru, ne z UI containeru
- Přidat nový ref: pdfRef (např. const pdfRef = useRef<HTMLDivElement>(null))
- Přidat state isPdfMode (např. const [isPdfMode, setIsPdfMode] = useState(false))
- V renderu:
  - Nechat stávající UI render beze změny.
  - Přidat skrytý off-screen blok (např. position: fixed; left:-10000px; top:0;), který renderuje AIInsightsContent s propem pdfMode={true} a ref={pdfRef}. (Tento blok bude jen při exportu nebo stále, dle preferencí; ideálně jen při exportu.)
- V handleExportPDF:
  - setIsPdfMode(true)
  - počkat na re-render (např. await new Promise(r => requestAnimationFrame(() => r(null))) + další raf)
  - počkat na dojití obrázků v pdfRef (helper “waitForImages(container)” – projde img a čeká na complete/onload)
  - zavolat html2pdf na pdfRef.current (ne na contentRef)
  - po dokončení setIsPdfMode(false)

- Změnit html2pdf options:
  - margin: 0 (protože padding řeší .pdf-page)
  - pagebreak: { mode: ['css'] } (bez “before”, bez “avoid” – ty dnes způsobují blank pages)
  - html2canvas: ponechat backgroundColor '#E9E9E9', windowWidth nastavit tak, aby odpovídal A4 landscape renderu (např. 1123px při 96dpi), nebo nechat a spoléhat na mm layout; důležité je stabilní výsledek.

3) src/components/reports/AIInsightsContent.tsx – přidat pdfMode a renderovat “stránky” jako .pdf-page wrappery
- Přidat nový prop: pdfMode?: boolean
- Když pdfMode=true:
  - Každý blok (Executive Summary, Top 5, Overview, Innovation, Sentiment, Leaderboard, každá creator performance, Summary) obalit do:
    <div className="pdf-page pdf-mode"> ... </div>
  - Uvnitř stránky mít jednu hlavní kartu (border, radius), ale bez toho, aby stránka “končila” bílým okrajem.
  - Skrytí UI prvků:
    - “Select Content” button (Settings2) – v PDF módu vůbec nerenderovat.
    - Edit buttony (pencil) – v PDF módu nerenderovat (nebo canEdit vynutit na false v PDF renderu).

Poznámka: Tím úplně odstraníme potřebu .pdf-page-break na Card elementech; pagebreak bude řídit wrapper .pdf-page.

4) src/components/reports/CreatorPerformanceCard.tsx – stabilní PDF layout + bez interaktivních prvků
- Rozšířit props o pdfMode?: boolean (nebo mode: 'screen' | 'pdf')
- V pdfMode:
  - Vynutit dvousloupcový layout vždy (grid-cols-2), nepoužívat md: breakpointy.
  - Zmenšit gapy, fonty, marginy.
  - Skryt edit ikonky (pencil) a inputy (renderovat čistě text).
  - Zachovat variant="flat" (bez vnější Card) – to už máme, ale doplnit i PDF kompaktní třídy.

5) src/components/reports/ContentPreviewCard.tsx – PDF kompaktní varianta (aby se creator vešel)
- Přidat prop size?: 'default' | 'pdf'
- V pdf variantě:
  - Zmenšit padding (p-4 -> p-3 / p-2)
  - Zmenšit text
  - Omezit hover efekty (shadow/transition)
  - Volitelně skrýt link “Zobrazit obsah” (v PDF většinou nedává smysl a zabírá místo)
- V CreatorPerformanceCard v pdfMode poslat size="pdf"

Očekávaný dopad na chyby
- Pozadí stránky bude #E9E9E9, protože:
  - html2pdf margin=0
  - každá stránka je .pdf-page element přesně na velikost A4 landscape a s bg #E9E9E9
- Prázdné stránky zmizí, protože:
  - zrušíme “double break” (nebudeme používat pagebreak.before + CSS break zároveň)
  - nebudeme používat pagebreak.avoid, které často způsobí přesuny celých bloků a generuje “empty leftovers”
- Rozbité karty se výrazně omezí, protože:
  - PDF módu zjednodušíme a zkompaktníme layout
  - stabilizujeme responsivitu (žádné md: pro klíčové gridy)
  - odstraníme UI prvky, které v PDF nemají funkci a jen rozbíjejí rozměry

Testovací checklist (po implementaci)
1) Export PDF z /reports/1dde8ef8-29a9-4a30-b1bc-a3236082e19e
2) Ověřit:
  - žádná prázdná stránka mezi creator kartami
  - každá stránka má pozadí #E9E9E9 “až do okraje” (bez bílé plochy)
  - creator karty nejsou uříznuté (konec karty není mimo stránku); pokud nějaký creator má extrémně dlouhý Key Insight, ověřit, že:
    - buď se vejde díky kompaktnímu módu, nebo
    - je deterministicky zkrácen (pokud se rozhodneme přidat line-clamp) – volitelné rozšíření

Volitelná “pojistka” (pokud i po kompaktním layoutu některé creator karty stále přesahují)
- Přidat v pdfMode pro Key Insight “max lines” (CSS line-clamp implementované ručně pro PDF mód) + na konec textu “…”
- Alternativně povolit, aby creator karta mohla zabrat 2 stránky, ale bez prázdné mezistránky (to je druhá varianta, pokud nechceme text zkracovat)

Dotčené soubory
- src/index.css
- src/components/reports/AIInsightsTab.tsx
- src/components/reports/AIInsightsContent.tsx
- src/components/reports/CreatorPerformanceCard.tsx
- src/components/reports/ContentPreviewCard.tsx

Poznámka k omezení ověření
- V aktuálním režimu (read-only) nemůžu export spustit a ověřit přímo v preview; po implementaci bude potřeba to otestovat end-to-end kliknutím na “Export PDF” a porovnat výsledný PDF.
