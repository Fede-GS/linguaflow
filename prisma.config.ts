import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// In sviluppo legge da .env.local (Next.js convention)
config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    // Session pooler (porta 5432) per DDL / migrazioni
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
})
