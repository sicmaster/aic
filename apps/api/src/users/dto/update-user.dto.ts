import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AssignableGroupCode } from './create-user.dto';

const USER_STATUSES = ['active', 'inactive', 'locked'] as const;
const ASSIGNABLE_GROUP_CODES = ['admin', 'operator'] as const;

export type UpdateUserStatus = (typeof USER_STATUSES)[number];

export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsIn(USER_STATUSES)
  status!: UpdateUserStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(ASSIGNABLE_GROUP_CODES, { each: true })
  groupCodes!: AssignableGroupCode[];
}
