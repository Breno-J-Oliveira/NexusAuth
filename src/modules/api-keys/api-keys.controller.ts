import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: any, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: any) {
    return this.apiKeysService.list(user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeysService.revoke(user.sub, id);
  }

  @Get('test')
  @UseGuards(ApiKeyGuard)
  async test(@CurrentUser() user: any) {
    return {
      message: 'API key authentication successful',
      userId: user.sub,
      permissions: user.permissions,
    };
  }
}
