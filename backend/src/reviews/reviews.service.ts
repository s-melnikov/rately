import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type SortOrder = 'newest' | 'highest' | 'lowest';

function buildOrderBy(sort: SortOrder) {
  switch (sort) {
    case 'highest':
      return { rating: 'desc' as const };
    case 'lowest':
      return { rating: 'asc' as const };
    case 'newest':
    default:
      return { createdAt: 'desc' as const };
  }
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findAll(productId: string, query: ReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? 'newest';

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: buildOrderBy(sort),
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(productId: string, dto: CreateReviewDto, user: JwtPayload) {
    // Verify product exists before creating review
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        username: user.username,
        email: user.email,
        productId,
      },
    });

    // Invalidate cached rating
    await this.redis.del(`product:${productId}:rating`);

    return review;
  }

  async update(id: string, dto: UpdateReviewDto, userEmail: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (review.email !== userEmail) throw new ForbiddenException('You can only edit your own reviews');

    const updated = await this.prisma.review.update({ where: { id }, data: dto });

    // Invalidate cached rating if rating changed
    if (dto.rating !== undefined) {
      await this.redis.del(`product:${review.productId}:rating`);
    }

    return updated;
  }

  async remove(id: string, userEmail: string): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (review.email !== userEmail) throw new ForbiddenException('You can only delete your own reviews');

    await this.prisma.review.delete({ where: { id } });
    await this.redis.del(`product:${review.productId}:rating`);
  }
}
