// Prisma 7 config: datasource URL used by CLI commands (db push, db seed, etc.)
// PrismaClient at runtime uses the PrismaPg driver adapter (see prisma.service.ts).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },
});
