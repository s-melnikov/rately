import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Amazing product!', description: 'Review title (3-100 chars)' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    example: 'This product exceeded all my expectations...',
    description: 'Review body (10-2000 chars)',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body: string;
}
