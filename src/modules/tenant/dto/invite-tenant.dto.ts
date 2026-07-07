import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class InviteTenantDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsIn(['ADMIN', 'MANAGER', 'USER'])
  @IsOptional()
  role?: string;
}
