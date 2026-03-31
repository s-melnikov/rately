import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface ProductListResult {
  items: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    category: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  avgRating: number | null;
  reviewCount: number;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async findAll(query: ProductQueryDto): Promise<ProductListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = query.category ? { category: query.category } : {};

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const cacheKey = `product:${id}:rating`;
    const cached = await this.redis.get(cacheKey);

    let avgRating: number | null = null;
    let reviewCount = 0;

    if (cached !== null) {
      const parsed = JSON.parse(cached) as { avg: number | null; count: number };
      avgRating = parsed.avg;
      reviewCount = parsed.count;
    } else {
      const result = await this.prisma.review.aggregate({
        where: { productId: id },
        _avg: { rating: true },
        _count: true,
      });
      avgRating = result._avg.rating;
      reviewCount = result._count;

      // Cache for 5 minutes regardless of whether there are reviews
      await this.redis.set(
        cacheKey,
        JSON.stringify({ avg: avgRating, count: reviewCount }),
        'EX',
        300,
      );
    }

    return { ...product, avgRating, reviewCount };
  }

  async invalidateRatingCache(productId: string): Promise<void> {
    await this.redis.del(`product:${productId}:rating`);
  }
}
