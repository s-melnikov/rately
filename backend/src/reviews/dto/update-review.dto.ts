import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, description: 'Updated rating (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated title' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated review body...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body?: string;
}
