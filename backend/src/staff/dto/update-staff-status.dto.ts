import { IsIn } from 'class-validator';

export class UpdateStaffStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
