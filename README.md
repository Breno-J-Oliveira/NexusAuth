# 🔐 NexusAuth — Microsserviço de Autenticação Centralizada

> **Categoria no portfólio:** Backend / Security
> **Prioridade:** 🔴 Alta · **Status:** ⚪ Não iniciado
> **Integra com:** Zenith · SaaS Multiempresa · Dashboard Financeiro · TCC SENAI (possível)

---

## 💡 Ideia Original (Breno)

Microsserviço e API que serve como autenticação centralizada e reutilizável. A ideia é que todos os meus outros projetos (Zenith, SaaS, Dashboard Financeiro, TCC SENAI) usem este mesmo serviço de auth, injetando o `tenant_id` direto no JWT quando aplicável.

Já tenho uma versão pensada como arquitetura de microsserviço rodando na porta 3000 + um app de teste na porta 4000.

---

## 🎯 Escopo

Microsserviço de autenticação centralizada, construído como API REST independente. Projetado para ser plug-and-play: qualquer aplicação pode integrar via middleware ou SDK compartilhado. É o **ponto único de identidade** para todos os projetos — um usuário se cadastra uma vez e acessa todos os apps (SSO). Demonstra conhecimento profundo de segurança, arquitetura de microsserviços e boas práticas de API.

### Funcionalidades principais

#### 🔑 Autenticação Core
- **Access Token (15min) + Refresh Token (7 dias):** tokens divididos para segurança máxima
- **Token Rotation:** refresh token é invalidado e regenerado a cada uso
- **Blacklist no Redis:** logout invalida o token imediatamente
- **JWT RS256:** assinatura com chave pública/privada (não HS256 simétrico)
- **JWKS endpoint:** apps validam token via chave pública sem segredo compartilhado

#### 📝 Cadastro & Conta
- **Registro com verificação de email:** token de confirmação enviado por email
- **Login social (OAuth2):** Google e GitHub — login sem criar conta nova
- **Magic link:** login sem senha via link enviado no email (passwordless)
- **Recuperação de senha:** via email com token de uso único (expira em 15min)
- **Políticas de senha:** mínimo 8 caracteres, complexidade (maiúscula, número, símbolo), histórico (não repetir últimas 5)
- **Troca de senha:** exige senha atual para alterar

#### 🛡️ Segurança
- **Rate Limiting:** 5 tentativas de login por minuto por IP (anti brute-force)
- **Account Lockout:** após 5 tentativas falhas, conta bloqueada por 15 minutos
- **2FA (TOTP):** autenticador de dois fatores com Google Authenticator / Authy (QR code)
- **Blacklist no Redis:** logout invalida tokens imediatamente
- **CORS configurável:** cada app registra sua origem permitida
- **Helmet:** headers de segurança (CSP, HSTS, X-Frame-Options, etc.)
- **Graceful Shutdown:** fecha conexões com Postgres e Redis com segurança ao reiniciar

#### 👥 Autorização
- **RBAC:** roles e permissões (admin, manager, user) — customizáveis por app
- **Multi-tenant:** `tenant_id` injetado no JWT para o SaaS Multiempresa
- **Impersonation:** admin pode agir como outro usuário (para suporte no SaaS) — auditado
- **Permissões granulares:** `users:read`, `users:write`, `billing:manage`, etc.

#### 📱 Gestão de Sessões
- **Sessões ativas:** listar todos os dispositivos/logins ativos (device, IP, localização, último acesso)
- **Revogar sessão:** logout de um dispositivo específico remotamente
- **Logout global:** revoga todas as sessões de uma vez
- **Detecção de novo dispositivo:** notifica por email quando login de dispositivo desconhecido

#### 📊 Audit Log
- **Todos os eventos rastreados:** login, logout, registro, troca de senha, 2FA ativado/desativado, impersonation, etc.
- **Metadados:** IP, user agent, dispositivo, localização (geolocalização por IP)
- **Retenção configurável:** logs mantidos por X dias
- **Endpoint de consulta:** admins podem ver histórico de auditoria

#### 🔌 Integração com Apps
- **SDK compartilhado:** package npm `@nexus/auth-sdk` com middleware pronto para Express/NestJS/Next.js
- **Webhooks:** notifica apps quando eventos acontecem:
  - `user.registered` — novo usuário cadastrado
  - `user.login` — usuário fez login
  - `user.logout` — usuário fez logout
  - `user.password_changed` — senha alterada
  - `user.email_verified` — email confirmado
  - `user.2fa_enabled` — 2FA ativado
  - `user.2fa_disabled` — 2FA desativado
  - `tenant.user_invited` — usuário convidado para empresa
  - `tenant.user_removed` — usuário removido da empresa
- **API Keys:** autenticação serviço-a-serviço (para comunicação entre backends sem JWT de usuário)
- **JWKS endpoint:** `/.well-known/jwks.json` para apps validarem tokens sem segredo

#### 📈 Observabilidade
- **Logs estruturados (Pino):** JSON logs com correlation ID em cada request
- **Métricas Prometheus:** `/metrics` endpoint (requests, logins, falhas, latência)
- **Health check detalhado:** `/health` verifica DB + Redis + SMTP
- **Erros padronizados:** respostas JSON com `code: "TOKEN_EXPIRED"`, `code: "RATE_LIMITED"`, etc.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| **Runtime** | Node.js 20+ | LTS, performance, ecossistema |
| **Framework** | NestJS | Arquitetura modular, DI, decorators — padrão enterprise |
| **Linguagem** | TypeScript | Type safety, autocompletion, padrão de mercado |
| **ORM** | Prisma | Type-safe, migrations, excelente DX |
| **Banco principal** | PostgreSQL | Relacional, robusto, padrão de mercado |
| **Cache/Blacklist** | Redis 7+ | In-memory, ultra rápido para rate limiting, blacklist e sessões |
| **Hashing** | bcrypt | Padrão de mercado para senhas |
| **JWT** | jsonwebtoken + jwks-rsa | Assinatura RS256 (chave pública/privada) + JWKS endpoint |
| **2FA** | otplib (TOTP) | Padrão TOTP — Google Authenticator, Authy |
| **OAuth2** | passport-google-oauth20, passport-github2 | Login social Google e GitHub |
| **Validação** | Zod | Type-safe validation, integra com TS |
| **Documentação** | Swagger/OpenAPI via @nestjs/swagger | Documentação interativa automática |
| **Email** | Resend ou Nodemailer | Verificação de email, recuperação de senha, magic link, notificações |
| **Logs** | Pino (estruturado) | JSON logs com correlation ID |
| **Métricas** | prom-client + prometheus | Endpoint /metrics para monitoramento |
| **Segurança** | Helmet | Headers HTTP de segurança |
| **Testes** | Jest + Supertest | Unit + integration tests |
| **Container** | Docker + Docker Compose | Padronização de ambiente |
| **CI/CD** | GitHub Actions | Lint, test, build automático |
| **SDK** | Package npm separado | `@nexus/auth-sdk` para apps integrarem |

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                     NexusAuth API (porta 3000)                 │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │   Auth   │ │  Users   │ │ Sessions │ │   Audit Log      │ │
│  │  Module  │ │  Module  │ │  Module  │ │    Module        │ │
│  │ login    │ │ CRUD     │ │ devices  │ │  events, IP,     │ │
│  │ register │ │ profile  │ │ revoke   │ │  user agent      │ │
│  │ refresh  │ │ password │ │ logout   │ │  retention       │ │
│  │ logout   │ │ 2FA      │ │ global   │ │                  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │            │            │                │           │
│  ┌────▼────────────▼────────────▼────────────────▼─────────┐ │
│  │   OAuth2    │  Rate Limiter  │  Webhooks   │  Metrics   │ │
│  │  Google     │  (Redis)       │  Dispatcher │  Prometheus│ │
│  │  GitHub     │  Lockout       │             │            │ │
│  └─────────────┴────────────────┴─────────────┴────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Prisma ORM                             │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                           │                                    │
│  ┌────────────────────────▼─────────────────────────────────┐ │
│  │              PostgreSQL + Redis + SMTP                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  /.well-known/jwks.json  ·  /health  ·  /metrics  ·  /docs│ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
          ▲              ▲              ▲              ▲
          │              │              │              │
    ┌─────┴────┐  ┌──────┴──────┐ ┌────┴──────┐ ┌─────┴──────┐
    │  Zenith  │  │    SaaS     │ │ Dashboard │ │  TCC SENAI │
    │ (web/app)│  │ Multiempresa│ │ Financeiro│ │  (possível)│
    └────┬─────┘  └──────┬──────┘ └─────┬─────┘ └────────────┘
         │               │              │
         └───────────────┼──────────────┘
                         │
                  ┌──────▼──────┐
                  │ @nexus/auth │
                  │    -sdk     │
                  │ (npm pkg)   │
                  └─────────────┘
```

### Estrutura de pastas (NestJS)
```
src/
  modules/
    auth/           → login, refresh, logout, register, magic-link, oauth2
    users/          → CRUD de usuários, perfil, troca de senha
    two-factor/     → 2FA (TOTP), ativar/desativar, verificar
    sessions/       → sessões ativas, revogar, logout global
    audit/          → audit log, consulta de eventos
    roles/          → RBAC, permissões granulares
    tenant/         → Multi-tenant support, convites
    webhooks/       → Dispatch de eventos para apps
    api-keys/       → API keys para serviço-a-serviço
    health/         → Health check (DB + Redis + SMTP)
  common/
    guards/         → JWT guard, RBAC guard, RateLimit guard, 2FA guard, ApiKey guard
    interceptors/   → Logging, error formatting, audit
    filters/        → Global exception filter
    decorators/     → @CurrentUser, @TenantId, @Permissions, @ApiKey
  config/           → Env vars, JWT keys, Redis config, OAuth2 config, SMTP config
  prisma/           → PrismaService, schema.prisma
```

### SDK compartilhado (`@nexus/auth-sdk`)
```
@nexus/auth-sdk/
  src/
    middleware/      → Express, NestJS, Next.js middleware
    guards/          → NestJS guards pronto para uso
    client/          → API client (login, refresh, logout, verify)
    types/           → Tipos compartilhados (User, Token, Session)
    hooks/           → React hooks (useAuth, useSession, useUser)
  package.json
```

---

## 📊 Modelo de Dados (Prisma)

```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password        String?  // bcrypt hash (null se OAuth2-only)
  name            String
  emailVerified   Boolean  @default(false)
  role            Role     @default(USER)
  tenantId        String?  // null = usuário global
  tenant          Tenant?  @relation(fields: [tenantId], references: [id])
  // 2FA
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // TOTP secret (criptografado)
  // OAuth2
  googleId        String?
  githubId        String?
  // Relacionamentos
  refreshTokens   RefreshToken[]
  sessions        Session[]
  auditLogs       AuditLog[]
  apiKeys         ApiKey[]
  passwordHistory String[] // últimos 5 hashes para não repetir
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Tenant {
  id            String   @id @default(uuid())
  name          String
  plan          Plan     @default(FREE)
  users         User[]
  apiKeys       ApiKey[]
  webhooks      Webhook[]
  createdAt     DateTime @default(now())
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  sessionId String   // vinculado à sessão
  session   Session  @relation(fields: [sessionId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Session {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  // Informações do dispositivo
  device      String   // "Chrome on Windows", "Safari on iPhone"
  ipAddress   String
  location    String?  // "São Paulo, BR" (geolocalização por IP)
  userAgent   String
  // Controle
  active      Boolean  @default(true)
  lastActiveAt DateTime @default(now())
  refreshTokens Token[]
  createdAt   DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  // null para eventos anônimos (login falhado)
  user        User?    @relation(fields: [userId], references: [id])
  action      AuditAction
  // Metadados
  ipAddress   String?
  userAgent   String?
  location    String?
  // Detalhes
  metadata    Json?    // dados extras do evento
  success     Boolean  @default(true) // false para tentativas falhadas
  createdAt   DateTime @default(now())
}

model ApiKey {
  id          String   @id @default(uuid())
  name        String   // nome identificador da chave
  key         String   @unique // hash da chave (prefixo nexus_xxx...)
  tenantId    String?
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  permissions String[] // permissões específicas da chave
  active      Boolean  @default(true)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}

model Webhook {
  id          String   @id @default(uuid())
  tenantId    String?
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  url         String   // endpoint do app que recebe o webhook
  events      String[] // ["user.login", "user.registered", ...]
  secret      String   // segredo para assinar o payload (HMAC)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model PasswordReset {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime // 15 minutos
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model EmailVerification {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime // 24 horas
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model MagicLink {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  expiresAt DateTime // 15 minutos
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum Role { ADMIN MANAGER USER }
enum Plan { FREE PRO ENTERPRISE }

enum AuditAction {
  LOGIN
  LOGIN_FAILED
  LOGOUT
  REGISTER
  PASSWORD_CHANGED
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  EMAIL_VERIFIED
  TWO_FACTOR_ENABLED
  TWO_FACTOR_DISABLED
  TWO_FACTOR_CHALLENGE
  SESSION_REVOKED
  GLOBAL_LOGOUT
  IMPERSONATION_STARTED
  IMPERSONATION_ENDED
  API_KEY_CREATED
  API_KEY_REVOKED
  TENANT_USER_INVITED
  TENANT_USER_REMOVED
}
```

---

## 🔌 Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cadastro de usuário (envia email de verificação) |
| POST | `/auth/login` | Login → access + refresh token |
| POST | `/auth/refresh` | Renova access token (rotation) |
| POST | `/auth/logout` | Logout → blacklist do token + revoga sessão |
| POST | `/auth/logout-all` | Logout global → revoga todas as sessões |
| POST | `/auth/forgot-password` | Envia email de recuperação |
| POST | `/auth/reset-password` | Reset com token de uso único |
| POST | `/auth/verify-email` | Confirma email com token |
| POST | `/auth/magic-link` | Solicita magic link por email |
| GET | `/auth/magic-link/verify` | Valida magic link → login |
| GET | `/auth/google` | Inicia OAuth2 com Google |
| GET | `/auth/google/callback` | Callback do Google |
| GET | `/auth/github` | Inicia OAuth2 com GitHub |
| GET | `/auth/github/callback` | Callback do GitHub |

### 2FA
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/2fa/enable` | Gera QR code para Google Authenticator |
| POST | `/2fa/verify` | Verifica código TOTP e ativa 2FA |
| POST | `/2fa/disable` | Desativa 2FA (exige senha) |
| POST | `/2fa/challenge` | Verifica código TOTP no login com 2FA |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/me` | Dados do usuário logado |
| PATCH | `/users/me` | Atualizar perfil |
| PATCH | `/users/me/password` | Trocar senha (exige senha atual) |

### Sessões
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/sessions` | Lista sessões ativas (device, IP, localização) |
| DELETE | `/sessions/:id` | Revoga sessão específica |

### Audit Log
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/audit` | Histórico de eventos (admin) |
| GET | `/audit/me` | Histórico do próprio usuário |

### API Keys
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api-keys` | Criar API key (serviço-a-serviço) |
| GET | `/api-keys` | Listar API keys |
| DELETE | `/api-keys/:id` | Revogar API key |

### Webhooks
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhooks` | Registrar webhook (URL + eventos) |
| GET | `/webhooks` | Listar webhooks |
| DELETE | `/webhooks/:id` | Remover webhook |

### Admin
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/admin/impersonate/:userId` | Iniciar impersonation (admin) |
| POST | `/admin/stop-impersonation` | Parar impersonation |

### Infra
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (DB + Redis + SMTP) |
| GET | `/metrics` | Métricas Prometheus |
| GET | `/.well-known/jwks.json` | Chave pública para validar JWT |
| GET | `/docs` | Swagger UI interativo |

---

## 🔗 Integrações

### Apps que usam NexusAuth

| App | Como usa | tenant_id | 2FA | Webhooks |
|-----|----------|-----------|-----|----------|
| **Zenith** | Auth de usuários (web + mobile) | Não | Opcional | `user.registered`, `user.login` |
| **SaaS Multiempresa** | Auth com `tenant_id` no JWT + RBAC + impersonation | Sim | Obrigatório para owner/admin | `tenant.user_invited`, `tenant.user_removed` |
| **Dashboard Financeiro** | Auth de usuários + 2FA obrigatório (dados financeiros) | Não | Obrigatório | `user.login`, `user.password_changed` |
| **TCC SENAI** (possível) | Auth de usuários | Não | Opcional | — |

### Como os apps integram

1. **SDK `@nexus/auth-sdk`** — middleware pronto para Express/NestJS/Next.js
   - Intercepta requisições, valida JWT via JWKS endpoint
   - Injeta `user`, `role`, `tenantId` no request
   - Redireciona para login do NexusAuth se token inválido
2. **JWKS endpoint** — apps validam JWT sem precisar do segredo (chave pública)
3. **Webhooks** — NexusAuth notifica apps quando eventos acontecem (HMAC assinado)
4. **API Keys** — comunicação backend-to-backend sem JWT de usuário
5. **App de teste (porta 4000)** — app simples de tarefas para validar o fluxo de auth end-to-end

### Fluxo de login (com 2FA)
```
App → POST /auth/login (email + senha)
     ↓
NexusAuth: valida senha → se 2FA habilitado:
     ↓
App → POST /2fa/challenge (código TOTP)
     ↓
NexusAuth: valida TOTP → retorna access + refresh token
     ↓
App: armazena tokens, usa em requisições
```

### Fluxo de OAuth2 (Google)
```
App → GET /auth/google → redirect para Google
     ↓
Google: usuário autoriza → redirect para /auth/google/callback
     ↓
NexusAuth: cria/atualiza usuário com googleId → retorna tokens
     ↓
App: usuário logado
```

---

## 📦 Entregáveis do Projeto

- [ ] Repositório Git com código fonte
- [ ] Docker Compose para rodar local (API + Postgres + Redis + app teste)
- [ ] SDK `@nexus/auth-sdk` publicado como package npm
- [ ] Documentação Swagger interativa
- [ ] README com instruções de setup e uso
- [ ] Coleção Postman/Insomnia para testar endpoints
- [ ] Testes automatizados (unit + integration)
- [ ] CI/CD no GitHub Actions
- [ ] Configuração de OAuth2 (Google + GitHub credentials)

---

## 🗺️ Fases de Desenvolvimento

### Fase 1 — Fundação
- [ ] Configurar projeto NestJS + TypeScript + Prisma
- [ ] Docker Compose (Postgres + Redis + API + app teste)
- [ ] Schema Prisma completo + migrations
- [ ] Config de ambiente (.env, JWT keys RS256, Redis, SMTP, OAuth2)
- [ ] Helmet + CORS configurável

### Fase 2 — Auth Core
- [ ] Registro com bcrypt + verificação de email
- [ ] Login com access token (15min, RS256)
- [ ] Refresh token com rotation (7 dias, Postgres)
- [ ] Logout com blacklist no Redis
- [ ] JWKS endpoint (/.well-known/jwks.json)
- [ ] Guards: JWT, RBAC

### Fase 3 — Segurança
- [ ] Rate limiting no Redis (5 tentativas/min/IP)
- [ ] Account lockout (5 tentativas falhas → bloqueia 15min)
- [ ] Políticas de senha (complexidade + histórico)
- [ ] Recuperação de senha (token de uso único, 15min)
- [ ] Graceful shutdown (SIGTERM/SIGINT)
- [ ] Logs estruturados com correlation ID (Pino)
- [ ] Erros padronizados com códigos

### Fase 4 — 2FA
- [x] Gerar QR code para TOTP (otplib)
- [x] Verificar código TOTP e ativar 2FA
- [x] Desativar 2FA (exige senha)
- [x] Challenge no login com 2FA
- [x] Códigos de backup (10 códigos de uso único)

### Fase 5 — OAuth2 & Magic Link
- [x] Login com Google (passport-google-oauth20)
- [x] Login com GitHub (passport-github2)
- [x] Magic link (login sem senha via email)
- [x] Vincular conta OAuth2 a usuário existente

### Fase 6 — Sessões & Audit
- [ ] Gestão de sessões (device, IP, localização, user agent)
- [ ] Revogar sessão específica
- [ ] Logout global (revoga todas)
- [ ] Notificação de novo dispositivo por email
- [ ] Audit log (todos os eventos com metadados)
- [ ] Endpoint de consulta de audit log

### Fase 7 — Multi-tenant & Impersonation
- [ ] Suporte a `tenant_id` no JWT
- [ ] Guard de tenant (isola dados por empresa)
- [ ] Middleware que injeta tenant no request
- [ ] Impersonation (admin age como outro usuário) — auditado
- [ ] Permissões granulares (`users:read`, `billing:manage`, etc.)

### Fase 8 — Webhooks & API Keys
- [ ] Sistema de webhooks (registrar URL + eventos)
- [ ] Dispatch de eventos com assinatura HMAC
- [ ] Retry de webhooks falhados (3 tentativas)
- [ ] API keys para serviço-a-serviço
- [ ] Guard de API Key

### Fase 9 — SDK & Documentação
- [ ] SDK `@nexus/auth-sdk` (middleware Express/NestJS/Next.js)
- [ ] React hooks (useAuth, useSession, useUser)
- [ ] Swagger/OpenAPI automático
- [ ] Testes unitários (Jest)
- [ ] Testes de integração (Supertest)
- [ ] App de teste na porta 4000

### Fase 10 — Observabilidade & Deploy
- [x] Métricas Prometheus (/metrics)
- [x] Health check detalhado (DB + Redis + SMTP)
- [x] CI/CD no GitHub Actions
- [ ] Deploy (Railway ou Render)
- [ ] Monitoramento de webhooks (dashboard de entregas)

---

## 🚀 Deploy

### Variáveis de ambiente obrigatórias (produção)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | String de conexão Redis | `redis://host:6379` |
| `JWT_PRIVATE_KEY_PATH` | Caminho da chave privada RS256 | `/app/keys/private.pem` |
| `JWT_PUBLIC_KEY_PATH` | Caminho da chave pública RS256 | `/app/keys/public.pem` |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `https://app1.com,https://app2.com` |
| `GOOGLE_CLIENT_ID` | OAuth2 Google | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Google | `GOCSPX-xxxxx` |
| `GOOGLE_CALLBACK_URL` | Callback Google | `https://api.domain.com/auth/google/callback` |
| `GITHUB_CLIENT_ID` | OAuth2 GitHub | `Iv1.xxxxx` |
| `GITHUB_CLIENT_SECRET` | OAuth2 GitHub | `xxxxx` |
| `GITHUB_CALLBACK_URL` | Callback GitHub | `https://api.domain.com/auth/github/callback` |
| `SMTP_HOST` | Servidor SMTP | `smtp.resend.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuário SMTP | `apikey` |
| `SMTP_PASS` | Senha SMTP | `re_xxxxx` |
| `SMTP_FROM` | Email remetente | `noreply@domain.com` |

### Gerando chaves RS256 em produção

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 4096
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
chmod 600 keys/private.pem
chmod 644 keys/public.pem
```

> Em produção, as chaves devem ser montadas como secrets (volume/Docker secret, k8s secret) — não geradas no container.

### Checklist de segurança antes de ir ao ar

- [ ] **Rotacionar todos os secrets**: JWT keys, OAuth secrets, SMTP credentials
- [ ] **CORS restritivo**: configurar `CORS_ORIGINS` apenas com os domínios reais das apps
- [ ] **HTTPS obrigatório**: reverse proxy (nginx/traefik) com TLS 1.2+
- [ ] `NODE_ENV=production` definido
- [ ] **Rate limiting ativo**: Redis acessível e configurado
- [ ] **Chaves RS256 protegidas**: não commitar no repo, usar secrets management
- [ ] **Database com senha forte**: usuário dedicado com permissões mínimas
- [ ] **Redis com AUTH**: configurar `requirepass` em produção
- [ ] **Logs estruturados ativos**: Pino configurado para JSON em produção
- [ ] **Helmet ativo**: headers de segurança habilitados
- [ ] **Backup do banco**: estratégia de backup automatizado
- [ ] **Monitoramento**: Prometheus scraping `/metrics`, alertas configurados

### Plataformas recomendadas

- **Railway**: deploy direto do repo, suporte a Postgres + Redis gerenciados
- **Render**: alternativa similar, free tier disponível
- **Docker**: imagem pronta para qualquer orchestrator (k8s, ECS, etc.)

### Health checks para orquestradores

| Endpoint | Propósito | Comportamento |
|----------|-----------|---------------|
| `GET /health/live` | Liveness probe | 200 sempre que o processo responde — não verifica dependências |
| `GET /health/ready` | Readiness probe | 200 se DB + Redis OK, 503 se alguma dependência falha |
| `GET /health` | Health completo | 200 se tudo OK, 503 se degradado |

> Configure liveness = `/health/live` e readiness = `/health/ready` no k8s/Render/Railway.

---

## 🎓 O que este projeto demonstra no portfólio
- **Arquitetura de microsserviços** (API independente, plug-and-play)
- **Segurança de APIs** (JWT RS256, rate limiting, blacklist, rotation, 2FA, account lockout)
- **SSO centralizado** (um login para múltiplos apps)
- **NestJS enterprise** (módulos, guards, interceptors, decorators)
- **Redis** (cache, rate limiting, blacklist, sessões)
- **Prisma ORM + PostgreSQL** (modelagem complexa com 10+ tabelas)
- **OAuth2** (Google, GitHub)
- **2FA / TOTP** (segurança adicional para apps financeiros)
- **Webhooks** (comunicação entre microsserviços)
- **API Keys** (autenticação serviço-a-serviço)
- **Audit log** (rastreabilidade completa)
- **SDK npm** (package reutilizável)
- **Observabilidade** (Prometheus, logs estruturados, health check)
- **Docker e containerização**
- **Testes automatizados**
- **Documentação de API** (Swagger)
- **Multi-tenant architecture**