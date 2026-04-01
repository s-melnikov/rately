import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Sony WH-1000XM5', description: 'Product name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'Industry-leading noise canceling headphones',
    description: 'Product description',
  })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'Product image URL',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: 'Electronics', description: 'Product category' })
  @IsString()
  category: string;
}
