/**
 * Sync the version from package.json to the Supabase app_config table.
 *
 * Usage:
 *   npm run version:sync
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   ← from Supabase dashboard → Project Settings → API
 *
 * Run after bumping the version in package.json and before (or after) deploying.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Load .env locally — on Vercel/CI env vars are already injected
const envFile = resolve(root, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] ??= val
    }
  }
}

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing env vars: VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  console.error('    Add SUPABASE_SERVICE_ROLE_KEY to your .env file.')
  console.error('    Find it in: Supabase dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const { error } = await supabase
  .from('app_config')
  .upsert({ key: 'app_version', value: version }, { onConflict: 'key' })

if (error) {
  console.error('❌  Failed to sync version:', error.message)
  process.exit(1)
}

console.log(`✓  Version ${version} synced to Supabase`)
