## 🔮 Atualização Futura — Provedores OAuth2 Adicionais

> **Status:** 📋 Planejado (pós Fase 10) · **Prioridade:** Média
> **Depende de:** Fase 5 (OAuth2 & Magic Link) já concluída

### Ideia

Expandir o login social pra suportar o máximo de redes possível, seguindo exatamente o mesmo padrão já validado com Google e GitHub na Fase 5: cada provedor novo é uma strategy Passport independente, com a mesma lógica de vinculação (busca por `providerId` → busca por `email` → vincula ou cria conta). Um usuário pode ter contas de múltiplas redes vinculadas ao mesmo perfil NexusAuth.

### Mudança de schema recomendada antes de expandir

Hoje o `User` provavelmente tem colunas fixas (`googleId`, `githubId`). Pra escalar pra muitos provedores sem ficar adicionando coluna toda vez, vale migrar para uma tabela separada:

```prisma
model OAuthAccount {
  id         String   @id @default(uuid())
  userId     String
  provider   String   // "google", "facebook", "discord", etc.
  providerId String   // ID do usuário na rede externa
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])

  @@unique([provider, providerId])
}
```

Isso permite adicionar qualquer provedor novo sem migration — só código.

### Provedores candidatos (avaliar e escolher)

| Provedor | Uso comum | Pacote Passport | Observações |
|---|---|---|---|
| **Facebook** | Redes sociais, e-commerce, apps de consumo | `passport-facebook` | Muito usado no Brasil; requer app review do Meta para produção |
| **Apple (Sign in with Apple)** | Obrigatório em apps iOS na App Store | `passport-apple` | Exige "Sign in with Apple" se você tiver outro login social num app iOS |
| **Microsoft (Azure AD / Outlook)** | Apps corporativos, B2B, SaaS empresarial | `passport-microsoft` ou `passport-azure-ad` | Bom encaixe pro "SaaS Multiempresa" do seu portfólio |
| **LinkedIn** | Apps B2B, recrutamento, produtividade | `passport-linkedin-oauth2` | Fluxo de app review mais burocrático |
| **Discord** | Apps de comunidade, jogos, ferramentas dev | `passport-discord` | Setup simples, popular em nicho tech/gaming |
| **X (Twitter)** | Redes sociais, apps de conteúdo | `passport-twitter` (OAuth 1.0a) ou `passport-oauth2` custom (OAuth 2.0) | Twitter mudou para OAuth 2.0 nativo — vale checar a strategy mais atual |
| **Instagram** | Apps de conteúdo visual, influencer/criador | `passport-instagram` | API da Meta, processo de review parecido com Facebook |
| **TikTok** | Apps voltados a criadores de conteúdo, Gen Z | `passport-tiktok` (ou OAuth2 custom) | Ecossistema de developer mais recente, vale checar maturidade do pacote |
| **Spotify** | Apps de música, entretenimento | `passport-spotify` | Simples de integrar, bom se algum projeto for de mídia |
| **Twitch** | Apps de streaming, comunidade gamer | `passport-twitch-new` | Nicho gaming/streaming |
| **Steam** | Apps e ferramentas para jogadores | `passport-steam` (OpenID) | Usa OpenID, não OAuth2 puro — implementação um pouco diferente |
| **Amazon (Login with Amazon)** | E-commerce, apps de compra | `passport-amazon` | Bom encaixe se algum projeto seu for e-commerce |
| **Slack** | Apps B2B, integrações de produtividade | `passport-slack` | Nicho ferramentas internas/times |
| **Yahoo** | Base de usuários legada, ainda relevante em alguns mercados | `passport-yahoo-oauth` | Uso em queda, baixa prioridade |
| **Reddit** | Apps de comunidade e conteúdo | `passport-reddit` | Nicho, comunidade tech |

### Sugestão de priorização (mais usados → mais nicho)

1. **Facebook** — ainda muito forte no Brasil, alta cobertura de usuários
2. **Apple** — se algum projeto for para iOS, isso deixa de ser opcional
3. **Microsoft** — encaixa direto no "SaaS Multiempresa" (B2B/corporativo)
4. **Discord** — fácil de implementar, bom para os projetos com pegada dev/gaming
5. Demais provedores — avaliar conforme o projeto específico que for consumir o NexusAuth (ex: Spotify/Twitch fazem sentido só se algum app for de mídia/streaming)

### Padrão de implementação (mesmo de Google/GitHub)

Para cada provedor escolhido:
1. Criar app de desenvolvedor na plataforma (processo parecido com Google Cloud Console / GitHub Developer Settings já feito)
2. Adicionar `<PROVIDER>_CLIENT_ID` e `<PROVIDER>_CLIENT_SECRET` ao `.env`
3. Criar a strategy em `src/modules/oauth/strategies/<provider>.strategy.ts`
4. Adicionar rotas `GET /auth/<provider>` e `GET /auth/<provider>/callback`
5. Reutilizar `OAuthService.handleOAuthLogin` (busca por providerId → email → vincula/cria)
6. Testar: criar conta nova, logar de novo com mesmo provedor (não duplica), vincular com conta já existente de outro provedor/e-mail
7. Auditar o evento de login (reaproveitar `AuditService` da Fase 6)

### Não incluído nessa atualização (fora de escopo por enquanto)
- Sign in with Apple exige configuração extra (Services ID, Key ID, chave privada `.p8`) — mais complexo que os demais, tratar com atenção quando chegar a vez
- Provedores com OpenID (Steam) usam fluxo diferente do OAuth2 — não reaproveita 100% do `OAuthService` atual