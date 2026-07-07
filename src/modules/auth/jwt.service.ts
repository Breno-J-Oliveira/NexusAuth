import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
  private privateKey: string;
  private publicKey: string;
  private accessExpiresIn: string;
  private issuer: string;

  constructor(private configService: ConfigService) {
    const privateKeyPath = this.configService.get<string>(
      'JWT_PRIVATE_KEY_PATH',
      './keys/private.pem',
    );
    const publicKeyPath = this.configService.get<string>(
      'JWT_PUBLIC_KEY_PATH',
      './keys/public.pem',
    );
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.issuer = this.configService.get<string>('JWT_ISSUER', 'nexusauth');
  }

  signAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
  }): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { ...payload, jti, type: 'access' },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn as any,
        issuer: this.issuer,
        keyid: 'nexusauth-1',
      },
    );
  }

  signImpersonationToken(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
    impersonatedBy: string;
  }): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { ...payload, jti, type: 'impersonation' },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn as any,
        issuer: this.issuer,
        keyid: 'nexusauth-1',
      },
    );
  }

  signChallengeToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { ...payload, jti, type: '2fa-challenge' },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '5m',
        issuer: this.issuer,
        keyid: 'nexusauth-1',
      },
    );
  }

  verify(token: string): {
    sub: string;
    email: string;
    role: string;
    jti: string;
    type: string;
    tenantId?: string;
    permissions?: string[];
    impersonatedBy?: string;
    exp: number;
    iat: number;
    iss: string;
  } {
    return jwt.verify(token, this.publicKey, { issuer: this.issuer }) as any;
  }

  verifyChallenge(token: string): {
    sub: string;
    email: string;
    role: string;
    jti: string;
    type: string;
    exp: number;
    iat: number;
    iss: string;
  } {
    const payload = this.verify(token);
    if (payload.type !== '2fa-challenge') {
      throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return payload;
  }

  getJwks() {
    const pubKeyObject = crypto.createPublicKey(this.publicKey);
    const jwk = pubKeyObject.export({ format: 'jwk' });
    return {
      keys: [
        {
          ...jwk,
          kid: 'nexusauth-1',
          use: 'sig',
          alg: 'RS256',
        },
      ],
    };
  }
}
