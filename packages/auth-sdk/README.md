# @nexus/auth-sdk

SDK para integração com NexusAuth — middleware Express/NestJS, React hooks, validação JWT via JWKS.

## Instalação

```bash
npm install @nexus/auth-sdk
```

## Cliente HTTP

```ts
import { NexusAuthClient } from '@nexus/auth-sdk';

const client = new NexusAuthClient({ baseUrl: 'http://localhost:3000' });

// Login
const tokens = await client.login('user@example.com', 'password');

// Refresh
const newTokens = await client.refresh(tokens.refreshToken);

// Perfil
const me = await client.me(tokens.accessToken);

// Logout
await client.logout(tokens.accessToken, tokens.refreshToken);
```

## Middleware Express

```ts
import { expressAuthMiddleware } from '@nexus/auth-sdk';

app.use('/api', expressAuthMiddleware({
  jwksUri: 'http://localhost:3000/.well-known/jwks.json',
}));

// Com permissões obrigatórias
app.use('/admin', expressAuthMiddleware({
  jwksUri: 'http://localhost:3000/.well-known/jwks.json',
  requiredPermissions: ['users:read', 'users:write'],
}));
```

## Middleware NestJS

```ts
import { NexusAuthGuard, RequireNexusPermissions } from '@nexus/auth-sdk';

// No módulo:
const guard = new NexusAuthGuard(new Reflector());
guard.setJwksUri('http://localhost:3000/.well-known/jwks.json');

// No controller:
@UseGuards(NexusAuthGuard)
@RequireNexusPermissions('users:read')
@Controller('users')
class UsersController { ... }
```

## React Hooks

```tsx
import { AuthProvider, useAuth, useUser } from '@nexus/auth-sdk';

function App() {
  return (
    <AuthProvider baseUrl="http://localhost:3000">
      <LoginForm />
    </AuthProvider>
  );
}

function LoginForm() {
  const { login, user, isAuthenticated, loading } = useAuth();

  if (isAuthenticated) return <div>Olá, {user?.name}</div>;
  return <button onClick={() => login('user@example.com', 'password')}>Login</button>;
}
```

### Hooks disponíveis

- `useAuth()` — `{ user, isAuthenticated, loading, error, login(), logout() }`
- `useSession()` — `{ sessions, loading }` (lista de sessões ativas)
- `useUser()` — `{ user, refreshUser(), loading }`

## Validação JWT via JWKS

O SDK faz fetch da chave pública do NexusAuth (`/.well-known/jwks.json`) uma vez e cacheia por 1 hora. A validação da assinatura RS256 é feita localmente, sem chamar a API a cada request.

## Segurança — Trade-off do localStorage

**Tokens (access + refresh) são armazenados em `localStorage`.** Isso os expõe a qualquer JavaScript rodando na página, incluindo ataques XSS. Se uma biblioteca de terceiros for comprometida ou um input não for sanitizado, um atacante pode roubar os tokens via `document.localStorage`.

Para produção com alta sensibilidade, considere:
- Armazenar o **refresh token** em cookie `httpOnly` (exige endpoint proxy no backend)
- Manter apenas o **access token** em memória (perde no refresh da página, mas inacessível a XSS)
- Usar um **service worker** para interceptar e anexar tokens às requisições

Este SDK usa `localStorage` por simplicidade e DX. O trade-off é documentado como decisão consciente — avalie seu modelo de ameaças antes de usar em produção.
