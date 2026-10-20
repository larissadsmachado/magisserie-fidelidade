# Magisserie · Cartão fidelidade digital

Código-fonte completo do painel: React, TypeScript, Vinext (compatível com a estrutura App Router), Vite, Drizzle e Cloudflare D1.

## Funcionalidades
- Cadastro por nome e WhatsApp.
- Registro de compras com selo da bruxinha.
- Histórico, correção de selos e resgate de 10 selos.
- Dados persistidos no servidor (D1), não no navegador.

## Requisitos e execução local
Node.js >= 22.13 e pnpm 11.25.0 (versão declarada no package.json).

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dazzling_sinister_six.sql
pnpm dev
```

Abra o endereço que o terminal informar. O banco local começa vazio e é separado do banco do site publicado.

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
