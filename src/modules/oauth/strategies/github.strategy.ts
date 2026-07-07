import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'placeholder',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'placeholder',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const user = {
      provider: 'github',
      providerId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName || profile.username,
      emailVerified: profile.emails[0]?.verified ?? false,
    };
    done(null, user);
  }
}
