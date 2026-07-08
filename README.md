# 🔐 NexusAuth — Microsserviço de Autenticação Centralizada

<p align="center">
  <img src="docs/logo/logo 16x9.png" alt="NexusAuth Banner" width="640">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-FINALIZADO-10B981?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status Finalizado">
  <img src="https://img.shields.io/badge/Versão-1.0-2563EB?style=for-the-badge" alt="Versão 1.0">
  <img src="https://img.shields.io/badge/Projeto-Portfólio%20Pessoal-111827?style=for-the-badge" alt="Projeto Pessoal">
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

## 📑 Índice

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Funcionalidades Principais](#-funcionalidades-principais)
3. [Tecnologias e Bibliotecas](#-tecnologias-e-bibliotecas)
4. [Arquitetura](#-arquitetura)
5. [Modelo de Dados (Prisma)](#-modelo-de-dados-prisma)
6. [Endpoints da API](#-endpoints-da-api)
7. [Fluxos de Autenticação](#-fluxos-de-autenticação)
8. [Integrações com Apps](#-integrações-com-apps)
9. [Segurança](#-segurança)
10. [Observabilidade](#-observabilidade)
11. [Como Rodar Localmente](#-como-rodar-localmente)
12. [Deploy em Produção](#-deploy-em-produção)
13. [Testes Automatizados](#-testes-automatizados)
14. [Fases de Desenvolvimento](#-fases-de-desenvolvimento)
15. [Próximas Atualizações](#-próximas-atualizações)
16. [Autor](#-autor)
17. [Contatos e Redes Sociais](#-contatos-e-redes-sociais)

---

## 🎯 Sobre o Projeto

O **NexusAuth** é um microsserviço de autenticação centralizada, construído como API REST independente com **NestJS** e **TypeScript**. Projetado para ser plug-and-play: qualquer aplicação pode integrar via middleware ou SDK compartilhado. É o **ponto único de identidade** para todos os projetos — um usuário se cadastra uma vez e acessa todos os apps (SSO).

A proposta é servir como autenticação reutilizável para todos os meus outros projetos (Zenith, SaaS Multiempresa, Dashboard Financeiro, TCC SENAI), injetando o `tenant_id` direto no JWT quando aplicável.

O projeto foi desenvolvido como **projeto de portfólio pessoal** (solo), demonstrando conhecimento profundo de segurança, arquitetura de microsserviços e boas práticas de API.

---

## �️ Funcionalidades Principais

### 🔑 Autenticação Core
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

## 🔗 Integrações com Apps

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

## 🔄 Fluxos de Autenticação

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

- [x] Repositório Git com código fonte
- [x] Docker Compose para rodar local (API + Postgres + Redis + app teste)
- [x] SDK `@nexus/auth-sdk` publicado como package npm
- [x] Documentação Swagger interativa
- [x] README com instruções de setup e uso
- [x] Coleção Postman/Insomnia para testar endpoints
- [x] Testes automatizados (unit + integration)
- [x] CI/CD no GitHub Actions
- [x] Configuração de OAuth2 (Google + GitHub credentials)
- [x] Auditoria de segurança completa (JWT alg confusion, SSRF, rate limiting, OAuth email verification)

---

## 🗺️ Fases de Desenvolvimento

### Fase 1 — Fundação
- [x] Configurar projeto NestJS + TypeScript + Prisma
- [x] Docker Compose (Postgres + Redis + API + app teste)
- [x] Schema Prisma completo + migrations
- [x] Config de ambiente (.env, JWT keys RS256, Redis, SMTP, OAuth2)
- [x] Helmet + CORS configurável

### Fase 2 — Auth Core
- [x] Registro com bcrypt + verificação de email
- [x] Login com access token (15min, RS256)
- [x] Refresh token com rotation (7 dias, Postgres)
- [x] Logout com blacklist no Redis
- [x] JWKS endpoint (/.well-known/jwks.json)
- [x] Guards: JWT, RBAC

### Fase 3 — Segurança
- [x] Rate limiting no Redis (5 tentativas/min/IP)
- [x] Account lockout (5 tentativas falhas → bloqueia 15min)
- [x] Políticas de senha (complexidade + histórico)
- [x] Recuperação de senha (token de uso único, 15min)
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [x] Logs estruturados com correlation ID (Pino)
- [x] Erros padronizados com códigos

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
- [x] Gestão de sessões (device, IP, localização, user agent)
- [x] Revogar sessão específica
- [x] Logout global (revoga todas)
- [x] Notificação de novo dispositivo por email
- [x] Audit log (todos os eventos com metadados)
- [x] Endpoint de consulta de audit log

### Fase 7 — Multi-tenant & Impersonation
- [x] Suporte a `tenant_id` no JWT
- [x] Guard de tenant (isola dados por empresa)
- [x] Middleware que injeta tenant no request
- [x] Impersonation (admin age como outro usuário) — auditado
- [x] Permissões granulares (`users:read`, `billing:manage`, etc.)

### Fase 8 — Webhooks & API Keys
- [x] Sistema de webhooks (registrar URL + eventos)
- [x] Dispatch de eventos com assinatura HMAC
- [x] Retry de webhooks falhados (3 tentativas)
- [x] API keys para serviço-a-serviço
- [x] Guard de API Key

### Fase 9 — SDK & Documentação
- [x] SDK `@nexus/auth-sdk` (middleware Express/NestJS/Next.js)
- [x] React hooks (useAuth, useSession, useUser)
- [x] Swagger/OpenAPI automático
- [x] Testes unitários (Jest)
- [x] Testes de integração (Supertest)
- [x] App de teste na porta 4000

### Fase 10 — Observabilidade & Deploy
- [x] Métricas Prometheus (/metrics)
- [x] Health check detalhado (DB + Redis + SMTP)
- [x] CI/CD no GitHub Actions
- [x] Deploy (Docker imagem pronta para qualquer orchestrator)
- [x] Monitoramento de webhooks (dashboard de entregas)

---

## 🚀 Deploy em Produção

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

---

## 🛡️ Segurança

### Auditoria de Segurança (Fase Final)

O projeto passou por uma auditoria completa de segurança, com correções implementadas e testadas:

| Vulnerabilidade | Severidade | Correção | Teste Manual |
|---|---|---|---|
| **JWT Algorithm Confusion** (RS256→HS256) | CRÍTICA | `algorithms: ['RS256']` em `jwt.verify()` | Token HS256 forjado rejeitado com 401 |
| **Privilege Escalation** (tenant/invite) | CRÍTICA | `@UseGuards(PermissionGuard)` + `@RequirePermission('tenant:manage')` | USER role recebe 403 |
| **2FA Brute Force** | ALTA | Rate limiting Redis (5 tentativas/60s) em todos os endpoints 2FA | 6ª tentativa retorna 429 |
| **SSRF em Webhooks** | ALTA | Validação de URL (bloqueia IPs privados/loopback/link-local) + DNS rebinding check | `localhost:6379` e `169.254.169.254` rejeitados com 400 |
| **OAuth Account Linking** | ALTA | Checa `emailVerified` antes de vincular conta por email | Contas não verificadas são rejeitadas |
| **CORS fail-open** | MÉDIA | `origin: false` em produção se `CORS_ORIGINS` vazio | — |
| **Swagger exposto** | MÉDIA | `/docs` desabilitado quando `NODE_ENV=production` | — |
| **Payload inconsistente** | MÉDIA | `tenantId` + `permissions` em todos os `signAccessToken` | — |
| **Header webhook incorreto** | MÉDIA | `X-Webhook-Event` envia nome do evento, não body inteiro | — |

### Recursos de segurança ativos

- **JWT RS256** com algoritmo restrito em verificação
- **Rate limiting** no login (5/min/IP) e 2FA (5/min)
- **Account lockout** após 5 tentativas falhas (15min)
- **Blacklist de tokens** no Redis (logout imediato)
- **Refresh token rotation** (single-use)
- **Políticas de senha** (complexidade + histórico de 5)
- **Helmet** (headers de segurança)
- **CORS fail-closed** em produção
- **SSRF guard** em webhooks (criação + dispatch)
- **OAuth email verification** antes de vincular contas
- **PermissionGuard** em rotas sensíveis

---

## 📈 Observabilidade

### Métricas Prometheus (`/metrics`)

| Métrica | Tipo | Descrição |
|---|---|---|
| `http_requests_total` | Counter | Requests HTTP por método/rota/status |
| `http_request_duration_seconds` | Histogram | Latência de resposta |
| `auth_registrations_total` | Counter | Registros de usuário |
| `auth_logins_total` | Counter | Logins (success/failed) |
| `auth_refresh_tokens_issued_total` | Counter | Refresh tokens emitidos |
| `auth_2fa_enabled_total` | Counter | 2FA ativado |
| `webhooks_dispatched_total` | Counter | Webhooks enviados (success/failed) |

### Health Checks

| Endpoint | Propósito | Comportamento |
|---|---|---|
| `GET /health/live` | Liveness probe | 200 sempre que o processo responde |
| `GET /health/ready` | Readiness probe | 200 se DB + Redis OK, 503 se dependência falha |
| `GET /health` | Health completo | 200 se tudo OK, 503 se degradado |

> Configure liveness = `/health/live` e readiness = `/health/ready` no k8s/Render/Railway.

---

## 💻 Como Rodar Localmente

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/Breno-J-Oliveira/NexusAuth.git
cd NexusAuth
```

### 2️⃣ Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais (ou use os valores padrão para desenvolvimento).

### 3️⃣ Suba tudo com Docker Compose

```bash
docker compose up -d
```

Isso sobe:
- **PostgreSQL** na porta 5432
- **Redis** na porta 6379
- **NexusAuth API** na porta 3000
- **App de teste** na porta 4000

### 4️⃣ Gere as chaves RS256 (se não existirem)

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### 5️⃣ Rode as migrations do Prisma

```bash
docker compose exec api npx prisma migrate deploy
```

### 6️⃣ Acesse a API

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/docs
- **Health:** http://localhost:3000/health
- **Métricas:** http://localhost:3000/metrics
- **JWKS:** http://localhost:3000/.well-known/jwks.json
- **App de teste:** http://localhost:4000

---

## 🧪 Testes Automatizados

### Testes E2E (Jest + Supertest)

```bash
# Build da imagem de teste
docker build -f Dockerfile.test -t nexusauth-test-runner .

# Rodar todos os testes E2E
docker run --rm --network nexusauth_nexus-net \
  --env DATABASE_URL="postgresql://nexus:nexus@postgres:5432/nexusauth" \
  --env REDIS_URL="redis://redis:6379" \
  --env JWT_PRIVATE_KEY_PATH="./keys/private.pem" \
  --env JWT_PUBLIC_KEY_PATH="./keys/public.pem" \
  --env NODE_ENV=test \
  nexusauth-test-runner npx jest --config test/jest-e2e.config.ts --forceExit --verbose
```

### Cobertura de testes

| Suíte | Testes | Status |
|---|---|---|
| `auth.e2e-spec.ts` | 12 | ✅ Passando |
| `integration.e2e-spec.ts` | 8 | ✅ Passando |
| `two-factor.e2e-spec.ts` | 8 | ✅ Passando |
| **Total** | **28** | **✅ Todos passando** |

### CI/CD (GitHub Actions)

O pipeline de CI roda automaticamente em cada push/PR:
1. **Lint** — verifica código com ESLint
2. **Test** — roda todos os testes E2E com Postgres e Redis service containers
3. **Build** — constrói a imagem Docker de produção

---

## 🔮 Próximas Atualizações

### Provedores OAuth2 Adicionais

> **Status:** 📋 Planejado | **Prioridade:** Média

Expansão do login social para suportar mais provedores, seguindo o mesmo padrão já validado com Google e GitHub:

| Provedor | Uso | Pacote Passport |
|---|---|---|
| **Facebook** | Redes sociais, e-commerce | `passport-facebook` |
| **Apple** | Apps iOS (obrigatório na App Store) | `passport-apple` |
| **Microsoft** | Apps corporativos, B2B | `passport-microsoft` |
| **Discord** | Comunidade, gaming | `passport-discord` |
| **LinkedIn** | B2B, recrutamento | `passport-linkedin-oauth2` |

**Mudança de schema recomendada:** migrar de colunas fixas (`googleId`, `githubId`) para uma tabela `OAuthAccount` separada, permitindo adicionar provedores sem migration.

> Veja o arquivo [`futura atualização.md`](futura%20atualização.md) para a lista completa de provedores e detalhes de implementação.

---

## 👤 Autor

<p align="center">
  <img src="docs/logo/logo 5x5.png" alt="NexusAuth Logo" width="80" height="80" style="border-radius: 50%;">
</p>

**Breno José de Oliveira**

Projeto solo — desenvolvimento, design, testes e documentação.

---

## 🤝 Contatos e Redes Sociais

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

## 🏁 Conclusão Final

O **NexusAuth** é um microsserviço de autenticação centralizada que demonstra, na prática, como construir uma API de identidade segura, escalável e pronta para produção. O projeto integra:

- **JWT RS256** com proteção contra algorithm confusion
- **2FA (TOTP)** com rate limiting e códigos de backup
- **OAuth2** (Google + GitHub) com verificação de email
- **Multi-tenant** com RBAC granular e impersonation auditado
- **Webhooks** com SSRF guard e assinatura HMAC
- **API Keys** para serviço-a-serviço
- **Observabilidade** com Prometheus, health checks e logs estruturados
- **Docker** com multi-stage build e CI/CD no GitHub Actions
- **28 testes E2E** cobrindo todos os fluxos principais
- **Auditoria de segurança** completa com 10 correções implementadas e testadas

O projeto pode evoluir para:

- Mais provedores OAuth2 (Facebook, Apple, Microsoft, Discord)
- Tabela `OAuthAccount` para suportar provedores dinamicamente
- Dashboard de monitoramento de webhooks
- Deploy em Railway/Render/k8s