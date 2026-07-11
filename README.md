# ðŸ” NexusAuth â€” MicrosserviÃ§o de AutenticaÃ§Ã£o Centralizada

<p align="center">
  <img src="docs/logo/logo 16x9.png" alt="NexusAuth Banner" width="640">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-FINALIZADO-10B981?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status Finalizado">
  <img src="https://img.shields.io/badge/VersÃ£o-1.0-2563EB?style=for-the-badge" alt="VersÃ£o 1.0">
  <img src="https://img.shields.io/badge/Projeto-PortfÃ³lio%20Pessoal-111827?style=for-the-badge" alt="Projeto Pessoal">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/JWT-RS256-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT RS256">
</p>

---

## ðŸ“‘ Ãndice

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Estado Atual](#-estado-atual)
3. [Funcionalidades Principais](#-funcionalidades-principais)
4. [Tecnologias e Bibliotecas](#-tecnologias-e-bibliotecas)
5. [Arquitetura](#-arquitetura)
6. [Endpoints da API](#-endpoints-da-api)
7. [Fluxos de AutenticaÃ§Ã£o](#-fluxos-de-autenticaÃ§Ã£o)
8. [IntegraÃ§Ãµes com Apps](#-integraÃ§Ãµes-com-apps)
9. [SeguranÃ§a](#-seguranÃ§a)
10. [Observabilidade](#-observabilidade)
11. [Como Rodar Localmente](#-como-rodar-localmente)
12. [Deploy em ProduÃ§Ã£o](#-deploy-em-produÃ§Ã£o)
13. [PrÃ³ximas AtualizaÃ§Ãµes](#-prÃ³ximas-atualizaÃ§Ãµes)
14. [Autor](#-autor)

---

## ðŸŽ¯ Sobre o Projeto

O **NexusAuth** Ã© um microsserviÃ§o de autenticaÃ§Ã£o centralizada, construÃ­do como API REST independente com **NestJS** e **TypeScript**. Projetado para ser plug-and-play: qualquer aplicaÃ§Ã£o pode integrar via middleware ou SDK compartilhado. Ã‰ o **ponto Ãºnico de identidade** para todos os projetos â€” um usuÃ¡rio se cadastra uma vez e acessa todos os apps (SSO).

A proposta Ã© servir como autenticaÃ§Ã£o reutilizÃ¡vel para todos os meus outros projetos (Zenith, SaaS Multiempresa, Dashboard Financeiro, TCC SENAI), injetando o `tenant_id` direto no JWT quando aplicÃ¡vel.

O projeto foi desenvolvido como **projeto de portfÃ³lio pessoal** (solo), demonstrando conhecimento profundo de seguranÃ§a, arquitetura de microsserviÃ§os e boas prÃ¡ticas de API.

---

## ðŸ“Š Estado Atual

O projeto estÃ¡ **finalizado e endurecido**, com **84 vulnerabilidades corrigidas** atravÃ©s de 4 passagens de auditoria de seguranÃ§a. Inclui proteÃ§Ãµes contra:

- **OWASP Top 10** completo
- **LGPD/GDPR** (export/delete de dados pessoais, consentimento)
- **JWT algorithm confusion** (alg: none, HS256 attack)
- **SSRF** (IP literal, private IP, DNS rebinding)
- **CSRF, XSS, timing attacks, race conditions**
- **Brute force, credential stuffing** (rate limiting progressivo)
- **Privilege escalation** (RBAC + permission guard)

**Camadas de defesa ativas:** 12+ (transporte, headers, auth, autorizaÃ§Ã£o, validaÃ§Ã£o, rate limit, criptografia, auditoria, concorrÃªncia, LGPD, threat intel, observabilidade).

### EstatÃ­sticas

| MÃ©trica | Valor |
|---------|-------|
| Vulnerabilidades corrigidas | **84** |
| Camadas de defesa | **12+** |
| Compliance | **LGPD, GDPR, OWASP Top 10** |
| MÃ³dulos de seguranÃ§a | **8 novos** (CSRF, Idempotency, Security Headers, LGPD, Threat Intel, Audit Integrity, Breached Password, Lockout) |
| Middlewares | **3 novos** |
| UtilitÃ¡rios | **3 novos** (HIBP, Audit Chain, Lockout) |

---

## ðŸ”‘ Funcionalidades Principais

### AutenticaÃ§Ã£o Core
- **Access Token (15min) + Refresh Token (7 dias):** tokens divididos para seguranÃ§a mÃ¡xima
- **Token Rotation:** refresh token Ã© invalidado e regenerado a cada uso
- **Blacklist no Redis:** logout invalida o token imediatamente
- **JWT RS256:** assinatura com chave pÃºblica/privada (nÃ£o HS256 simÃ©trico)
- **Algorithm Whitelist:** rejeita `alg: none` e HS256 confusion attacks
- **JWKS endpoint:** apps validam token via chave pÃºblica sem segredo compartilhado

### Cadastro & Conta
- **Registro com verificaÃ§Ã£o de email obrigatÃ³ria** (anti account takeover)
- **Breached Password Detection** (Have I Been Pwned k-anonymity)
- **Login social (OAuth2):** Google e GitHub â€” com email verification check
- **Magic link:** login sem senha via link enviado no email (passwordless)
- **RecuperaÃ§Ã£o de senha:** via email com token de uso Ãºnico (expira em 15min)
- **PolÃ­ticas de senha:** mÃ­nimo 8 caracteres, complexidade, histÃ³rico (nÃ£o repetir Ãºltimas 5), bloqueio de senhas comuns e padrÃµes de teclado
- **Constant-time password comparison** (anti timing attack)

### SeguranÃ§a
- **Helmet** com CSP estrito + HSTS preload (2 anos) + COOP/CORP
- **CSRF Protection** (double-submit cookie)
- **Idempotency Keys** (Idempotency-Key header)
- **Permissions-Policy** (desabilita geolocation, camera, mic, etc.)
- **Rate Limiting:** por IP e por email
- **Progressive Account Lockout:** 1â†’5â†’15minâ†’24hâ†’disabled
- **2FA (TOTP):** com backup codes, replay detection, challenge token blacklist
- **SSRF Guard:** bloqueia IPs privados, link-local, metadata services
- **Atomic Logout:** transaÃ§Ã£o Ãºnica previne race conditions

### AutorizaÃ§Ã£o
- **RBAC:** roles (admin, manager, user)
- **Multi-tenant:** `tenant_id` no JWT + tenant isolation
- **Impersonation:** admin age como outro usuÃ¡rio (auditado, sem chaining)
- **PermissÃµes granulares:** `users:read`, `billing:manage`, etc.
- **Permission Guard** com whitelist de roles em DTOs

### GestÃ£o de SessÃµes
- **SessÃµes ativas:** listar todos os dispositivos (device, IP, localizaÃ§Ã£o)
- **Revogar sessÃ£o:** logout remoto
- **Logout global:** revoga todas as sessÃµes
- **Concurrent session policy** (MAX_CONCURRENT_SESSIONS)
- **Inactivity timeout** (SESSION_INACTIVITY_HOURS)

### LGPD/GDPR
- **Export de dados pessoais** (`GET /me/data/export`) com SHA-256 checksum
- **Soft/Hard delete** (`DELETE /me/data`) com confirmaÃ§Ã£o explÃ­cita
- **Consentimento granular** (`POST /me/data/consent`)
- **Audit log integrity** (hash chain estilo Certificate Transparency)

### IntegraÃ§Ã£o com Apps
- **SDK compartilhado:** package npm `@nexus/auth-sdk`
- **Webhooks:** notifica apps em eventos (HMAC assinado)
- **API Keys:** autenticaÃ§Ã£o serviÃ§o-a-serviÃ§o
- **JWKS endpoint:** `/.well-known/jwks.json`
- **Threat Intelligence:** IP reputation scoring

### Observabilidade
- **Logs estruturados (Pino)** com redact de PII (LGPD)
- **MÃ©tricas Prometheus** (`/metrics`)
- **Health check** (`/health/live`, `/health/ready`)
- **Audit log** completo com retenÃ§Ã£o configurÃ¡vel
- **Correlation ID** em cada request

---

## ðŸ› ï¸ Stack TecnolÃ³gica

| Camada | Tecnologia | VersÃ£o |
|--------|-----------|--------|
| **Runtime** | Node.js | 20+ |
| **Framework** | NestJS | 10.4 |
| **Linguagem** | TypeScript | 5.5 |
| **ORM** | Prisma | 5.18 |
| **Banco principal** | PostgreSQL | 16 |
| **Cache/Blacklist** | Redis | 7 |
| **Hashing** | bcrypt | 5.1 |
| **JWT** | jsonwebtoken | 9.0 |
| **2FA** | otplib (TOTP) | 12.0 |
| **OAuth2** | passport-google-oauth20, passport-github2 | â€” |
| **ValidaÃ§Ã£o** | Zod + class-validator | 3.23 / 0.14 |
| **DocumentaÃ§Ã£o** | Swagger/OpenAPI | 7.4 |
| **Logs** | Pino (com redact) | 9.3 |
| **MÃ©tricas** | prom-client | 15.1 |
| **SeguranÃ§a** | Helmet, cookie-parser | 7.1 / 1.4 |
| **Container** | Docker + Docker Compose | â€” |

---

## ðŸ—ï¸ Arquitetura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  Load Balancer / WAF                         â”‚
â”‚            (HTTPS termination, DDoS protection)              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                            â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     NexusAuth API                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Middlewares (ordem)                                    â”‚ â”‚
â”‚  â”‚  1. Trust proxy    2. Helmet (CSP, HSTS)                â”‚ â”‚
â”‚  â”‚  3. Body parser    4. Cookie parser                     â”‚ â”‚
â”‚  â”‚  5. Security headers (Permissions-Policy)              â”‚ â”‚
â”‚  â”‚  6. CSRF           7. Idempotency                       â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                            â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Guards                                                 â”‚ â”‚
â”‚  â”‚  â€¢ JwtAuthGuard (global)   â€¢ ApiKeyGuard               â”‚ â”‚
â”‚  â”‚  â€¢ RolesGuard              â€¢ PermissionGuard            â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                            â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Interceptors / Filters                                 â”‚ â”‚
â”‚  â”‚  â€¢ AllExceptionsFilter (sem leak de erros)             â”‚ â”‚
â”‚  â”‚  â€¢ LoggingInterceptor (Pino + correlation ID)          â”‚ â”‚
â”‚  â”‚  â€¢ MetricsInterceptor (Prometheus)                     â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                            â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  MÃ³dulos                                                â”‚ â”‚
â”‚  â”‚  Auth Â· 2FA Â· OAuth Â· Sessions Â· Tenant Â· Admin        â”‚ â”‚
â”‚  â”‚  Webhooks Â· API Keys Â· Audit Â· JWKS Â· LGPD             â”‚ â”‚
â”‚  â”‚  Health Â· Metrics Â· Threat Intel                        â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                            â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Utilities                                              â”‚ â”‚
â”‚  â”‚  â€¢ crypto (AES-256-GCM, SHA-256, timingSafeEqual)      â”‚ â”‚
â”‚  â”‚  â€¢ ssrf-guard (validaÃ§Ã£o de URLs)                       â”‚ â”‚
â”‚  â”‚  â€¢ breached-password (HIBP k-anonymity)                â”‚ â”‚
â”‚  â”‚  â€¢ audit-integrity (hash chain)                        â”‚ â”‚
â”‚  â”‚  â€¢ lockout (progressive)                               â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                            â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              PostgreSQL  Â·  Redis  Â·  SMTP                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Estrutura de pastas

```
src/
â”œâ”€â”€ common/
â”‚   â”œâ”€â”€ guards/         â†’ JWT, ApiKey, Roles, Permission
â”‚   â”œâ”€â”€ decorators/     â†’ @Public, @CurrentUser, @Roles, @RequirePermission
â”‚   â”œâ”€â”€ filters/        â†’ AllExceptionsFilter
â”‚   â”œâ”€â”€ interceptors/   â†’ Logging (Pino), Metrics
â”‚   â”œâ”€â”€ middleware/     â†’ CSRF, Idempotency, SecurityHeaders
â”‚   â”œâ”€â”€ pipes/          â†’ ZodValidation
â”‚   â””â”€â”€ utils/          â†’ crypto, ssrf-guard, breached-password, audit-integrity, lockout
â”œâ”€â”€ config/             â†’ env validation, configuration
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ auth/           â†’ login, refresh, logout, register, OAuth
â”‚   â”œâ”€â”€ two-factor/     â†’ TOTP setup, verify, disable, challenge
â”‚   â”œâ”€â”€ sessions/       â†’ gestÃ£o de sessÃµes ativas
â”‚   â”œâ”€â”€ audit/          â†’ audit log + verificaÃ§Ã£o de integridade
â”‚   â”œâ”€â”€ tenant/         â†’ multi-tenant, convites
â”‚   â”œâ”€â”€ admin/          â†’ impersonation
â”‚   â”œâ”€â”€ webhooks/       â†’ dispatch de eventos
â”‚   â”œâ”€â”€ api-keys/       â†’ autenticaÃ§Ã£o service-to-service
â”‚   â”œâ”€â”€ oauth/          â†’ estratÃ©gias Google + GitHub
â”‚   â”œâ”€â”€ jwks/           â†’ endpoint JWKS
â”‚   â”œâ”€â”€ health/         â†’ health checks
â”‚   â”œâ”€â”€ metrics/        â†’ Prometheus
â”‚   â”œâ”€â”€ lgpd/           â†’ export/delete/consent (LGPD/GDPR)
â”‚   â””â”€â”€ threat-intel/   â†’ IP reputation scoring
â”œâ”€â”€ prisma/             â†’ PrismaService
â””â”€â”€ redis/              â†’ RedisService
```

---

## ðŸ”Œ Endpoints da API

### AutenticaÃ§Ã£o
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/auth/register` | â€” | Cadastro (envia email verificaÃ§Ã£o) |
| POST | `/auth/login` | â€” | Login â†’ access + refresh token |
| POST | `/auth/refresh` | â€” | Renova access token (rotation) |
| POST | `/auth/logout` | JWT | Blacklist + revoga sessÃ£o |
| POST | `/auth/forgot-password` | â€” | Solicita reset |
| POST | `/auth/reset-password` | â€” | Reset com token |
| POST | `/auth/verify-email` | â€” | Confirma email |
| POST | `/auth/magic-link` | â€” | Solicita magic link |
| POST | `/auth/magic-link/verify` | â€” | Valida magic link |
| GET | `/auth/google` | â€” | Inicia OAuth Google |
| GET | `/auth/google/callback` | â€” | Callback Google |
| GET | `/auth/github` | â€” | Inicia OAuth GitHub |
| GET | `/auth/github/callback` | â€” | Callback GitHub |

### 2FA
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/2fa/setup` | JWT | Gera QR code TOTP |
| POST | `/2fa/verify` | JWT | Ativa 2FA |
| POST | `/2fa/disable` | JWT | Desativa 2FA |
| POST | `/2fa/challenge` | â€” | Verifica TOTP no login |

### UsuÃ¡rio
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| GET | `/auth/me` | JWT | Dados do usuÃ¡rio logado |
| POST | `/auth/change-password` | JWT | Trocar senha |

### SessÃµes
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| GET | `/sessions` | JWT | Lista sessÃµes ativas |
| DELETE | `/sessions/:id` | JWT | Revoga sessÃ£o |
| POST | `/sessions/logout-all` | JWT | Revoga todas |

### LGPD/GDPR
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| GET | `/me/data/export` | JWT | Exporta todos os dados pessoais |
| DELETE | `/me/data` | JWT | Soft/hard delete (LGPD Art. 18) |
| POST | `/me/data/consent` | JWT | Registra consentimento |

### Tenant
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/tenant` | JWT | Criar tenant |
| POST | `/tenant/invite` | JWT + `tenant:manage` | Convidar usuÃ¡rio |
| POST | `/tenant/invite/accept` | JWT | Aceitar convite |
| GET | `/tenant/members` | JWT + `users:read` | Listar membros |

### API Keys
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/api-keys` | JWT | Criar API key |
| GET | `/api-keys` | JWT | Listar API keys |
| DELETE | `/api-keys/:id` | JWT | Revogar |
| GET | `/api-keys/test` | API Key | Testar API key |

### Webhooks
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/webhooks` | JWT | Registrar webhook |
| GET | `/webhooks` | JWT | Listar |
| PATCH | `/webhooks/:id` | JWT | Atualizar |
| DELETE | `/webhooks/:id` | JWT | Remover |
| GET | `/webhooks/:id/deliveries` | JWT | HistÃ³rico de entregas |

### Admin
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| POST | `/admin/impersonate/:userId` | JWT + ADMIN | Iniciar impersonation |
| POST | `/admin/stop-impersonation` | JWT | Parar impersonation |

### Audit Log
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| GET | `/audit-log` | JWT + ADMIN | HistÃ³rico (com tenant isolation) |

### Infra
| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
|--------|------|------|-----------|
| GET | `/health/live` | â€” | Liveness probe |
| GET | `/health/ready` | â€” | Readiness (DB + Redis) |
| GET | `/health` | â€” | Health completo |
| GET | `/metrics` | JWT + ADMIN | Prometheus |
| GET | `/.well-known/jwks.json` | â€” | Chave pÃºblica JWT |
| GET | `/.well-known/openid-configuration` | â€” | OIDC config |
| GET | `/docs` | â€” | Swagger UI (dev only) |

---

## ðŸ”„ Fluxos de AutenticaÃ§Ã£o

### Login com 2FA
```
App â†’ POST /auth/login (email + senha)
     â†“
NexusAuth: bcrypt verify + rate limit + email check
     â†“ (se 2FA habilitado)
App â†’ POST /2fa/challenge (TOTP code + challengeToken)
     â†“
NexusAuth: verify TOTP + blacklist challenge + cria sessÃ£o
     â†“
App: armazena accessToken + refreshToken
```

### OAuth2 (Google)
```
App â†’ GET /auth/google â†’ redirect Google
     â†“
Google â†’ /auth/google/callback
     â†“
NexusAuth: verifica email verificado â†’ cria/vincula user
     â†“
Tokens emitidos
```

### Magic Link
```
App â†’ POST /auth/magic-link (email)
     â†“
User recebe email com link Ãºnico (15min)
     â†“
App â†’ POST /auth/magic-link/verify (token)
     â†“
NexusAuth: cria sessÃ£o â†’ tokens
```

---

## ðŸ›¡ï¸ SeguranÃ§a

### Arquitetura de Defesa em Profundidade (12 camadas)

1. **Transporte:** HTTPS + HSTS preload (2 anos)
2. **Headers:** Helmet (CSP, HSTS, COOP, CORP) + Permissions-Policy
3. **CSRF:** double-submit cookie
4. **Idempotency:** para operaÃ§Ãµes crÃ­ticas
5. **AutenticaÃ§Ã£o:** JWT RS256 + algorithm whitelist + blacklist + sessÃ£o + 2FA + OAuth
6. **AutorizaÃ§Ã£o:** Roles + Permissions + Tenant isolation + role whitelist em DTOs
7. **ValidaÃ§Ã£o:** Zod + class-validator + sanitizaÃ§Ã£o + IP literal block
8. **Rate Limiting:** Redis distribuÃ­do (IP + email) + progressive lockout
9. **Criptografia:** bcrypt (12 rounds) + AES-256-GCM + SHA-256 + timingSafeEqual
10. **Auditoria:** Pino com redact de PII + hash chain + threat intel
11. **ConcorrÃªncia:** transaÃ§Ãµes atÃ´micas + MAX_CONCURRENT_SESSIONS + inactivity timeout
12. **LGPD/GDPR:** export/delete/consent + anonymization

### ProteÃ§Ãµes Ativas

| Categoria | ImplementaÃ§Ã£o |
|-----------|---------------|
| Brute Force | Rate limit (IP + email), progressive lockout |
| Credential Stuffing | Rate limit por email, lockout |
| Token Theft | Blacklist + session validation |
| 2FA Bypass | Challenge token blacklist + TOTP replay detection |
| Privilege Escalation | Permission Guard + role whitelist em DTOs |
| SSRF | IP literal block, metadata services, DNS rebinding |
| JWT Bypass | Algorithm whitelist + post-verify re-check |
| SQL Injection | Prisma (parameterized queries) |
| XSS | CSP estrito, Helmet |
| CSRF | double-submit cookie |
| Timing Attack | Dummy hash, constant-time delay |
| DoS | Body limit, token length limit, rate limiting |
| Session Fixation | Session validation |
| DNS Rebinding | IP pinning |
| User Enumeration | Mensagens genÃ©ricas, timing constante |
| Race Condition | TransaÃ§Ãµes atÃ´micas com guards |
| Account Takeover | REQUIRE_EMAIL_VERIFIED |
| Parallel Sessions | MAX_CONCURRENT_SESSIONS |
| LGPD/GDPR | Export/delete/consent + redact de PII |

### VariÃ¡veis de SeguranÃ§a

| VariÃ¡vel | DescriÃ§Ã£o | Default |
|----------|-----------|---------|
| `ENCRYPTION_KEY` | AES-256-GCM key (64 hex) | obrigatÃ³rio em prod |
| `MAX_LOGIN_ATTEMPTS` | Tentativas antes de lockout | 5 |
| `LOCKOUT_DURATION_MINUTES` | DuraÃ§Ã£o inicial do lockout | 15 |

| SESSION_TIMEOUT_HOURS | Timeout absoluto de sessÃ£o | 168 (7 dias) |
| MAX_CONCURRENT_SESSIONS | MÃ¡ximo de sessÃµes simultÃ¢neas (1 = single-session) | 999 |
| SESSION_INACTIVITY_HOURS | Timeout de inatividade | 24 |
| REQUIRE_EMAIL_VERIFIED | Exigir email verificado para login | true |
| REQUEST_BODY_LIMIT | Tamanho mÃ¡ximo do body | 100kb |
| TRUST_PROXY_HOPS | Hops de proxy confiÃ¡vel | 0 |
| CORS_ORIGINS | Origens permitidas (CSV) | â€” |
| REDIS_FLUSH_TOKEN | Token para FLUSHALL em prod | â€” |
| CSP_REPORT_ONLY | CSP em modo report-only | false |
| CSP_REPORT_URI | Endpoint para CSP violations | /api/csp-report |
| ABUSEIPDB_API_KEY | API key para threat intel (opcional) | â€” |

---

## ðŸ“ˆ Observabilidade

### MÃ©tricas Prometheus (/metrics)

| MÃ©trica | Tipo | DescriÃ§Ã£o |
|---|---|---|
| http_requests_total | Counter | Requests HTTP por mÃ©todo/rota/status |
| http_request_duration_seconds | Histogram | LatÃªncia de resposta |
| uth_registrations_total | Counter | Registros |
| uth_logins_total | Counter | Logins (success/failed) |
| uth_refresh_tokens_issued_total | Counter | Refresh tokens emitidos |
| uth_2fa_enabled_total | Counter | 2FA ativado |
| webhooks_dispatched_total | Counter | Webhooks enviados (success/failed) |

### Health Checks

| Endpoint | PropÃ³sito |
|---|---|
| GET /health/live | Liveness probe (sempre 200) |
| GET /health/ready | Readiness (200 se DB+Redis OK) |
| GET /health | Health completo (200 ok / 503 degraded) |

---

## ðŸ’» Como Rodar Localmente

### 1. Clone e configure

`ash
git clone https://github.com/Breno-J-Oliveira/NexusAuth.git
cd NexusAuth
cp .env.example .env
`

Edite o .env com suas credenciais (valores padrÃ£o jÃ¡ funcionam para dev local).

### 2. Suba tudo com Docker Compose

`ash
docker compose up -d
`

ServiÃ§os iniciados:
- **PostgreSQL** na porta 5432
- **Redis** na porta 6379
- **NexusAuth API** na porta 3000
- **App de teste** na porta 4000

### 3. Gere as chaves RS256 (se necessÃ¡rio)

`ash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
`

### 4. Rode as migrations

`ash
docker compose exec api npx prisma migrate deploy
`

### 5. Acesse a API

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/docs
- **Health:** http://localhost:3000/health
- **MÃ©tricas:** http://localhost:3000/metrics
- **JWKS:** http://localhost:3000/.well-known/jwks.json
- **App de teste:** http://localhost:4000

---

## ðŸš€ Deploy em ProduÃ§Ã£o

### Gerando chaves RS256

`ash
mkdir -p keys
openssl genrsa -out keys/private.pem 4096
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
chmod 600 keys/private.pem
chmod 644 keys/public.pem
`

> Em produÃ§Ã£o, monte as chaves como secrets (volume, Docker secret, k8s secret).

### Checklist PrÃ©-Deploy

- [ ] NODE_ENV=production
- [ ] ENCRYPTION_KEY configurada (64 hex chars)
- [ ] CORS_ORIGINS com domÃ­nios especÃ­ficos
- [ ] MAX_CONCURRENT_SESSIONS definido
- [ ] REQUIRE_EMAIL_VERIFIED=true
- [ ] REDIS_FLUSH_TOKEN configurado
- [ ] Chaves RSA em volume seguro (chmod 600)
- [ ] PostgreSQL com senha forte
- [ ] Redis com senha forte
- [ ] TRUST_PROXY_HOPS correto
- [ ] HTTPS no load balancer
- [ ] Logs centralizados ativos
- [ ] Alertas: falhas auth, token reuse, lockout

### Plataformas Recomendadas

- **Railway** â€” deploy direto do repo
- **Render** â€” alternativa com free tier
- **Docker / k8s** â€” imagem pronta para qualquer orchestrator

---

## ðŸ”® PrÃ³ximas AtualizaÃ§Ãµes

| Item | Status | Prioridade |
|------|--------|------------|
| Tabela OAuthAccount (multi-provider dinÃ¢mico) | ðŸ“‹ Planejado | MÃ©dia |
| Mais provedores OAuth2 (Facebook, Apple, Microsoft) | ðŸ“‹ Planejado | MÃ©dia |
| Dashboard de webhooks | ðŸ“‹ Planejado | Baixa |
| Webhook signing com timestamp (replay protection) | ðŸ“‹ Planejado | Alta |
| JWT key rotation automÃ¡tica | ðŸ“‹ Planejado | Alta |
| Risk-based authentication | ðŸ“‹ Planejado | Alta |
| Vault integration para secrets | ðŸ“‹ Planejado | Alta |
| WAF integration (Cloudflare/AWS) | ðŸ“‹ Planejado | MÃ©dia |
| SIEM integration | ðŸ“‹ Planejado | MÃ©dia |
| Argon2id migration | ðŸ“‹ Planejado | Baixa |
| WebAuthn / Passkeys (FIDO2) | ðŸ“‹ Planejado | MÃ©dia |
| Bug Bounty program | ðŸ“‹ Planejado | Baixa |

---

## ðŸ‘¤ Autor

<p align="center">
  <img src="docs/logo/logo 5x5.png" alt="NexusAuth Logo" width="80" height="80" style="border-radius: 50%;">
</p>

**Breno JosÃ© de Oliveira** â€” Projeto solo (desenvolvimento, design, testes, documentaÃ§Ã£o).

---

## ðŸ¤ Contatos e Redes Sociais

<p align="center">
  <a href="https://github.com/Breno-J-Oliveira" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white">
  </a>
  <a href="https://www.linkedin.com/in/breno-j-oliveira-672619352/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white">
  </a>
  <a href="https://www.instagram.com/brenoov" target="_blank">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white">
  </a>
  <a href="https://x.com/BrenoJOliveira_" target="_blank">
    <img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white">
  </a>
</p>

---

## ðŸ“„ DocumentaÃ§Ã£o Adicional

- [docs/RELATORIO_FINAL_SEGURANCA.md](docs/RELATORIO_FINAL_SEGURANCA.md) â€” auditoria de seguranÃ§a completa
- [docs/GUIA_MELHORIAS_SEGURANCA.md](docs/GUIA_MELHORIAS_SEGURANCA.md) â€” 80+ melhorias sugeridas
- [docs/IMPLEMENTACAO_MELHORIAS.md](docs/IMPLEMENTACAO_MELHORIAS.md) â€” melhorias jÃ¡ implementadas
- [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) â€” documentaÃ§Ã£o tÃ©cnica