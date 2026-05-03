import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateGroupPoliciesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  policyCodes!: string[];
}
