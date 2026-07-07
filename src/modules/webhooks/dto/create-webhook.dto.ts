import { IsString, IsArray, ArrayMinSize, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events!: string[];
}
