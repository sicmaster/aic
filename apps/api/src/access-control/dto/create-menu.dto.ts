import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @MaxLength(120)
  code!: string;

  @IsString()
  @MaxLength(160)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  icon?: string;

  @IsInt()
  @Min(1)
  @Max(3)
  level!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder = 0;

  @IsOptional()
  @IsBoolean()
  isActive = true;
}
