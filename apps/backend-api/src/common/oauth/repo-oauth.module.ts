import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RepoOAuthStateService } from './repo-oauth-state.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? config.get<string>('AUTH_SECRET') ?? 'change_me',
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  providers: [RepoOAuthStateService],
  exports: [RepoOAuthStateService, JwtModule],
})
export class RepoOAuthModule {}
