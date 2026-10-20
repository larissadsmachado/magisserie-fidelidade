# Magisserie · Cartão fidelidade digital

Código-fonte completo do painel: React, TypeScript, Vinext (compatível com a estrutura App Router), Vite, Drizzle e Cloudflare D1.

## Funcionalidades
- Cadastro por nome e WhatsApp.
- Registro de compras com selo da bruxinha.
- Histórico, correção de selos e resgate de 10 selos.
- Dados persistidos no servidor (D1), não no navegador.
- Painel administrativo protegido por senha e limite de tentativas.
- Consulta individual do cartão por WhatsApp e PIN, com opção de baixar o cartão em PNG.

## Requisitos e execução local
Node.js >= 22.13 e pnpm 11.25.0 (versão declarada no package.json).

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler d1 execute DB --local --config wrangler.local.jsonc --persist-to .wrangler/state --file drizzle/0000_dazzling_sinister_six.sql
pnpm exec wrangler d1 execute DB --local --config wrangler.local.jsonc --persist-to .wrangler/state --file drizzle/0001_admin_and_customer_access.sql
pnpm dev
```

Para desenvolvimento, configure `.env` na raiz do projeto (ao lado de `package.json`). `pnpm dev` carrega esse arquivo pelo plugin Cloudflare Vite. `pnpm start` cria temporariamente `dist/server/.dev.vars` com as duas variáveis e remove esse arquivo quando o preview termina. `.dev.vars` também é o formato local do Wrangler; não crie manualmente esse arquivo temporário dentro de `dist/server`:

```text
ADMIN_PASSWORD=escolha-sua-senha
AUTH_SECRET=cole-aqui-um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

`ADMIN_PASSWORD` precisa estar definida, mas não há mínimo de caracteres. Para proteger o painel, ainda é recomendado usar uma senha forte e exclusiva. `AUTH_SECRET` deve ter pelo menos 32 caracteres aleatórios; gere-o com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. `.env*` e `.dev.vars*` são ignorados pelo Git. Abra o endereço que o terminal informar. O banco local começa vazio e é separado do banco do site publicado.

## Acesso e migração do banco

O painel da cozinha fica em `/` e pede a senha compartilhada das administradoras. O cliente consulta somente o próprio cartão em `/cartao`, informando WhatsApp e PIN. Ao cadastrar um cliente, o painel mostra um PIN aleatório de seis dígitos uma única vez; entregue-o ao cliente. Para clientes que já existiam antes da migração, use **Gerar novo PIN** no painel.

As rotas administrativas também exigem uma sessão assinada no servidor; esconder a tela de login não é a única proteção. Os PINs não são armazenados em texto puro. Em produção, configure `ADMIN_PASSWORD` e `AUTH_SECRET` como Runtime secrets do Worker. `ADMIN_PASSWORD` não tem mínimo de caracteres; use uma senha forte e exclusiva. `AUTH_SECRET` exige pelo menos 32 caracteres aleatórios. Esses valores são lidos de `cloudflare:workers` no runtime e nunca são embutidos no código do cliente. Nunca os inclua no repositório.

A migração [0001_admin_and_customer_access.sql](./drizzle/0001_admin_and_customer_access.sql) faz duas alterações:
- adiciona `customers.pin_hash`, inicialmente vazio para clientes já cadastrados;
- cria `access_attempts`, usada para limitar tentativas de senha e PIN.

Para o banco local, rode os dois comandos de migração da seção anterior, uma única vez cada. Para o banco publicado, aplique **a migração `0001`** no D1 correto antes de publicar a nova versão. No Cloudflare, isso pode ser feito pelo console SQL do D1 executando o conteúdo do arquivo, ou com `wrangler d1 execute DB --remote --config dist/server/wrangler.json --file drizzle/0001_admin_and_customer_access.sql` depois de configurar a ligação `DB` com o ID real do banco. Não execute a migração `0000` novamente em um banco que já tem as tabelas.

O portal do cliente precisa estar acessível publicamente para que clientes possam entrar. Se a hospedagem bloquear todo o site para visitantes, será necessário ajustar essa restrição; o painel administrativo continua protegido pela senha e as rotas de clientes não retornam a lista de cadastros.

## Onde editar
- `app/page.tsx`: interface e ações do cartão.
- `app/globals.css`: cores, layout e estilos.
- `app/api/loyalty/route.ts`: operações de cadastro, compra e resgate.
- `db/schema.ts`: estrutura das tabelas.
- `drizzle/`: migrações SQL.
- `public/selo.png`: imagem da bruxinha.
- `vite.config.ts`, `build/` e `scripts/`: configuração e infraestrutura.

## Colocar no seu GitHub
Crie um repositório vazio e execute na pasta extraída:

```bash
git init
git add .
git commit -m "Projeto inicial Magisserie"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/magisserie-fidelidade.git
git push -u origin main
```

Não há credenciais, banco de clientes ou histórico Git anterior neste pacote. Não envie arquivos `.env`, tokens ou dados pessoais ao repositório.

## Hospedagem e banco próprios
GitHub guarda e versiona o código. GitHub Pages sozinho não executa a API nem o D1 deste projeto.

A versão entregue mantém a infraestrutura usada no Sites do ChatGPT. Para hospedar fora dele, será necessário adaptar a configuração de publicação para sua conta Cloudflare Workers e vincular um D1 próprio, aplicando as migrações de `drizzle/`. O banco do site atual não é transferido automaticamente e não está incluído neste ZIP. A identidade do projeto hospedado foi retirada da configuração desta cópia.

Importante: o painel publicado hoje é protegido pelo acesso privado do Sites. Antes de publicar esta cópia fora dessa plataforma, implemente autenticação e autorização no servidor para proteger os dados e as operações dos clientes. Não publique a API aberta.

## Validação
O projeto original passou por build, verificação TypeScript e testes SQL de saldo/resgate. Esta cópia contém os mesmos arquivos de aplicação; a execução em outra máquina e a hospedagem independente ainda precisam ser verificadas.
