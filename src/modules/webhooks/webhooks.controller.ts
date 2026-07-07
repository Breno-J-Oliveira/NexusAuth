import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Registrar webhook (retorna secret uma única vez)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.sub, dto);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar webhooks (sem secret)' })
  async list(@CurrentUser() user: any) {
    return this.webhooksService.list(user.sub);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar webhook (ativar/desativar, eventos, URL)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remover webhook' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.remove(user.sub, id);
  }

  @Get(':id/deliveries')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar tentativas de entrega do webhook' })
  async deliveries(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.listDeliveries(user.sub, id);
  }
}
