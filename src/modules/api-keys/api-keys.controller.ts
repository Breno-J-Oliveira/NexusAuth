import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../redis/redis.service';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private apiKeysService: ApiKeysService,
    private redisService: RedisService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar API key (retorna chave completa apenas uma vez)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateApiKeyDto, @Req() req: Request) {
    // V11 fix: rate limit API key creation
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:api-key:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.apiKeysService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar API keys (prefixo mascarado)' })
  async list(@CurrentUser() user: any) {
    return this.apiKeysService.list(user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revogar API key' })
  async revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeysService.revoke(user.sub, id);
  }

  @Get('test')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Testar autenticação via API key' })
  async test(@CurrentUser() user: any) {
    return {
      message: 'API key authentication successful',
      userId: user.sub,
      permissions: user.permissions,
    };
  }
}
