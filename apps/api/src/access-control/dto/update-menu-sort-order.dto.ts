import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class UpdateMenuSortOrderItemDto {
  @IsString()
  code!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class UpdateMenuSortOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateMenuSortOrderItemDto)
  items!: UpdateMenuSortOrderItemDto[];
}
