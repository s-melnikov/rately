import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReviewQueryDto {
  @ApiPropertyOptional({
    enum: ['newest', 'highest', 'lowest'],
    default: 'newest',
    description: 'Sort order for reviews',
  })
  @IsOptional()
  @IsEnum(['newest', 'highest', 'lowest'])
  sort?: 'newest' | 'highest' | 'lowest' = 'newest';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
