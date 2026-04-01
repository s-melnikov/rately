import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Prisma 7 requires a driver adapter — no direct URL in PrismaClient constructor.
// We expose `product` and `review` delegates so call-sites stay unchanged.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly client: PrismaClient;

  readonly product: PrismaClient['product'];
  readonly review: PrismaClient['review'];

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
    this.product = this.client.product;
    this.review = this.client.review;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    await this.pool.end();
  }
}
