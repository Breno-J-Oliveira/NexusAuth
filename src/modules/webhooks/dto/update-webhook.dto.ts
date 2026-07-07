import { IsBoolean, IsArray, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsString()
  url?: string;
}
