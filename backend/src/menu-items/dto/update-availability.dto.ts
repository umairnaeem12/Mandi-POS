import { IsIn } from 'class-validator';

// Maps a single availability status onto the underlying boolean flags.
export class UpdateAvailabilityDto {
  @IsIn(['AVAILABLE', 'OUT_OF_STOCK', 'INACTIVE'])
  status!: 'AVAILABLE' | 'OUT_OF_STOCK' | 'INACTIVE';
}
