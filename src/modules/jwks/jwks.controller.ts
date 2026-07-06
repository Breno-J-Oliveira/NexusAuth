import { Controller, Get } from '@nestjs/common';
import { JwtService } from '../auth/jwt.service';

@Controller()
export class JwksController {
  constructor(private jwtService: JwtService) {}

  @Get('.well-known/jwks.json')
  jwks() {
    return this.jwtService.getJwks();
  }
}
