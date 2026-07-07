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
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.sub, dto);
  }

  @Get()
  async list(@CurrentUser() user: any) {
    return this.webhooksService.list(user.sub);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(user.sub, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.remove(user.sub, id);
  }

  @Get(':id/deliveries')
  async deliveries(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.listDeliveries(user.sub, id);
  }
}
