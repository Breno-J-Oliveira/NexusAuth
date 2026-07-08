import { Controller, Get } from '@nestjs/common';
import { JwtService } from '../auth/jwt.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class JwksController {
  constructor(private jwtService: JwtService) {}

  @Public()
  @Get('.well-known/jwks.json')
  jwks() {
    return this.jwtService.getJwks();
  }

  @Public()
  @Get('.well-known/openid-configuration')
  openidConfiguration() {
    return {
      issuer: process.env.JWT_ISSUER || 'nexusauth',
      jwks_uri: '/.well-known/jwks.json',
      response_types_supported: ['id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    };
  }
}
