import { IsArray, IsString } from 'class-validator';

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[]; // permission names — full replace of the role's permissions
}
