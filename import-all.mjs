import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://rltxqoupobfohrkrbtib.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdHhxb3Vwb2Jmb2hya3JidGliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ2MzMwOSwiZXhwIjoyMDg4MDM5MzA5fQ.gxDfiD8HV7iY7zrC9LnzKOcMlSj4h48B2A4uJQA2jik'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Robust CSV parser – handles quoted fields with semicolons, newlines, escaped quotes
function parseCSV(content) {
  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  while (i < content.length) {
    const ch = content[i]

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
        }
      } else {
        currentField += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ';') {
        currentRow.push(currentField)
        currentField = ''
      } else if (ch === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
        continue
      } else {
        currentField += ch
      }
    }
    i++
  }

  currentRow.push(currentField)
  if (currentRow.some(f => f !== '')) rows.push(currentRow)

  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(row => row.some(f => f !== ''))
    .map(row => {
      const obj = {}
      headers.forEach((header, idx) => {
        obj[header] = parseValue(row[idx] ?? '', header)
      })
      return obj
    })
}

// Columns that must be '' instead of null (NOT NULL DEFAULT '')
const EMPTY_STRING_COLS = new Set(['age', 'gender', 'location'])

function parseValue(val, colName) {
  if (val === '' || val === null || val === undefined) {
    return EMPTY_STRING_COLS.has(colName) ? '' : null
  }
  if (val === 'true') return true
  if (val === 'false') return false

  const trimmed = val.trim()
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try { return JSON.parse(trimmed) } catch {}
  }

  return val
}

function findCSV(tableName) {
  const exportDir = join(__dirname, 'export')
  const files = readdirSync(exportDir)
  const match = files.find(f => f.startsWith(tableName + '-export'))
  if (!match) return null
  return join(exportDir, match)
}

function loadCSV(tableName) {
  const filePath = findCSV(tableName)
  if (!filePath) {
    console.log(`  ⚠  No CSV found for ${tableName}, skipping`)
    return []
  }
  const content = readFileSync(filePath, 'utf-8')
  const data = parseCSV(content)
  console.log(`  Loaded ${data.length} rows from ${tableName}`)
  return data
}

async function createAuthUser(id, email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id,
      email,
      email_confirm: true,
      password: 'ChangeMe123!'
    })
  })
  const data = await res.json()
  if (data.error || data.msg) {
    const msg = data.error || data.msg
    if (!msg.includes('already') && !msg.includes('exists')) {
      console.error(`  Auth error for ${email}: ${msg}`)
    }
  }
}

async function importTable(tableName, data, batchSize = 50) {
  if (data.length === 0) return

  let errors = 0
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const { error } = await supabase.from(tableName).upsert(batch)

    if (error) {
      for (const row of batch) {
        const { error: rowErr } = await supabase.from(tableName).upsert(row)
        if (rowErr) {
          errors++
          if (errors <= 3) console.error(`  Row error in ${tableName}: ${rowErr.message}`)
        }
      }
    }
  }
  const status = errors > 0 ? `(${errors} errors)` : '✓'
  console.log(`  ${status} ${tableName} – ${data.length} rows`)
}

async function main() {
  console.log('=== DataStoryTLRS – Full Import ===\n')

  // 1. Auth users (profiles)
  console.log('1. profiles – creating auth users first')
  const profilesData = loadCSV('profiles')
  for (const p of profilesData) {
    if (p.id && p.email) await createAuthUser(p.id, p.email)
  }
  await importTable('profiles', profilesData)

  // 2. No dependencies
  console.log('\n2. user_roles')
  await importTable('user_roles', loadCSV('user_roles'))

  console.log('\n3. tags')
  await importTable('tags', loadCSV('tags'))

  console.log('\n4. ai_prompts')
  await importTable('ai_prompts', loadCSV('ai_prompts'))

  // 3. spaces
  console.log('\n5. spaces')
  await importTable('spaces', loadCSV('spaces'))

  // 4. depends on spaces
  console.log('\n6. space_users')
  await importTable('space_users', loadCSV('space_users'))

  console.log('\n7. projects')
  await importTable('projects', loadCSV('projects'))

  console.log('\n8. brand_campaigns')
  await importTable('brand_campaigns', loadCSV('brand_campaigns'))

  console.log('\n9. tiktok_campaigns')
  await importTable('tiktok_campaigns', loadCSV('tiktok_campaigns'))

  console.log('\n10. space_ai_insights')
  await importTable('space_ai_insights', loadCSV('space_ai_insights'))

  console.log('\n11. ads_metric_snapshots')
  await importTable('ads_metric_snapshots', loadCSV('ads_metric_snapshots'))

  // 5. depends on spaces + projects
  console.log('\n12. reports')
  await importTable('reports', loadCSV('reports'))

  // 6. depends on spaces + brand_campaigns
  console.log('\n13. brand_ad_sets')
  await importTable('brand_ad_sets', loadCSV('brand_ad_sets'))

  // 7. depends on spaces + brand_ad_sets
  console.log('\n14. brand_ads')
  await importTable('brand_ads', loadCSV('brand_ads'))

  // 8. depends on spaces + tiktok_campaigns
  console.log('\n15. tiktok_ad_groups')
  await importTable('tiktok_ad_groups', loadCSV('tiktok_ad_groups'))

  // 9. depends on spaces + tiktok_ad_groups
  console.log('\n16. tiktok_ads')
  await importTable('tiktok_ads', loadCSV('tiktok_ads'))

  // 10. depends on reports
  console.log('\n17. data_imports')
  await importTable('data_imports', loadCSV('data_imports'))

  console.log('\n18. creators')
  await importTable('creators', loadCSV('creators'))

  console.log('\n19. kpi_targets')
  await importTable('kpi_targets', loadCSV('kpi_targets'))

  console.log('\n20. audit_log')
  await importTable('audit_log', loadCSV('audit_log'))

  console.log('\n21. media_plan_items')
  await importTable('media_plan_items', loadCSV('media_plan_items'))

  // 11. depends on reports + brand_campaigns
  console.log('\n22. report_campaigns')
  await importTable('report_campaigns', loadCSV('report_campaigns'))

  // 12. depends on reports + tiktok_campaigns
  console.log('\n23. report_tiktok_campaigns')
  await importTable('report_tiktok_campaigns', loadCSV('report_tiktok_campaigns'))

  // 13. depends on reports + creators
  console.log('\n24. content')
  await importTable('content', loadCSV('content'))

  console.log('\n25. promo_codes')
  await importTable('promo_codes', loadCSV('promo_codes'))

  console.log('\n26. screenshot_influencer')
  await importTable('screenshot_influencer', loadCSV('screenshot_influencer'))

  // 14. depends on content + tags
  console.log('\n27. content_tags')
  await importTable('content_tags', loadCSV('content_tags'))

  console.log('\n✅ Import complete!')
}

main().catch(console.error)
