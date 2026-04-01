import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Amazing product!', description: 'Review title (max 100 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    example: 'This product exceeded all my expectations...',
    description: 'Review body (max 2000 chars)',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body?: string;
}
