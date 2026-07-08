import { IsBoolean, IsArray, IsOptional, IsString, IsUrl, ArrayMinSize } from 'class-validator';

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
  @IsUrl()
  url?: string;
}
