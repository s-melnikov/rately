import { Module } from '@nestjs/common';
import { ReviewsController, ReviewsItemController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ReviewsController, ReviewsItemController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
