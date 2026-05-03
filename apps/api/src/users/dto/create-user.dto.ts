import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ASSIGNABLE_GROUP_CODES = ['admin', 'operator'] as const;

export type AssignableGroupCode = (typeof ASSIGNABLE_GROUP_CODES)[number];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(ASSIGNABLE_GROUP_CODES, { each: true })
  groupCodes!: AssignableGroupCode[];
}
