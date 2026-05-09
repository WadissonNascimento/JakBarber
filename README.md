# Barbearia App

Aplicacao Next.js para barbearia com cadastro de clientes, login por perfil, agenda, painel de barbeiro, painel administrativo, loja, pedidos, cupons e relatorios financeiros.

## Stack

- Next.js 14
- TypeScript
- Prisma 5
- PostgreSQL/Supabase
- NextAuth
- Tailwind CSS
- Mercado Pago

## Setup local do zero

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Gere o Prisma Client:

```bash
npx prisma generate
```

4. Aplique as migrations no banco:

```bash
npx prisma migrate deploy
```

5. Popule o banco com dados de desenvolvimento:

```bash
npx prisma db seed
```

6. Rode o projeto:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Reset completo do banco de desenvolvimento

Quando o banco de desenvolvimento estiver inconsistente ou voce quiser recriar tudo do zero:

```bash
npx prisma migrate reset
```

O comando apaga os dados do banco configurado em `DATABASE_URL`, recria o schema a partir das migrations e executa o seed automaticamente. Use somente em banco de desenvolvimento.

## Credenciais do seed

Todos os usuarios abaixo usam a senha `123456`.

Admin:

```text
admin@barbearia.com
```

Barbeiros:

```text
lucas@seed.jakbarber.local
bruno@seed.jakbarber.local
caio@seed.jakbarber.local
```

Cliente demo:

```text
cliente01@seed.jakbarber.local
```

O seed tambem cria clientes adicionais, servicos, disponibilidade dos barbeiros, agendamentos dos ultimos 3 meses, produtos, cupom e pedidos simulados.

## Variaveis de ambiente

Variaveis minimas para desenvolvimento:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:SUA_SENHA@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:SUA_SENHA@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="troque-essa-chave-por-uma-bem-grande"
AUTH_SECRET="troque-essa-chave-por-uma-bem-grande"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="troque-por-um-token-longo-e-aleatorio"
ADMIN_EMAIL="admin@barbearia.com"
ADMIN_PASSWORD="123456"
BARBER_WHATSAPP_NUMBER="5511999999999"
MERCADO_PAGO_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxx"
MERCADO_PAGO_WEBHOOK_SECRET="troque-se-quiser-validar-webhook"
EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASS=""
EMAIL_FROM=""
```

Em desenvolvimento local, se as variaveis de SMTP ficarem vazias, o cadastro e a recuperacao de senha usam fallback local e exibem/logam o codigo de verificacao. Em producao, configure SMTP real.

## Lembretes de agendamento

O endpoint protegido `/api/cron/appointment-reminders` envia lembretes por e-mail para atendimentos que estao cerca de 30 minutos no futuro. Configure `CRON_SECRET` no ambiente da VPS e agende uma chamada a cada 5 minutos:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://SEU_DOMINIO/api/cron/appointment-reminders
```

Cada agendamento e marcado com `reminderSentAt` depois do envio, evitando lembretes duplicados.

O endpoint protegido `/api/cron/barber-daily-agenda` envia o resumo da agenda do dia para barbeiros com atendimentos. Agende uma chamada de manha, por exemplo as 07:00:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://SEU_DOMINIO/api/cron/barber-daily-agenda
```

Os envios sao registrados em `EmailDeliveryLog` por template e evento, evitando duplicidade quando o cron roda novamente.

## Prisma e PostgreSQL

O schema usa PostgreSQL via Supabase. Campos de dominio como `role`, `status`, `commissionType`, `discountType` e `type` seguem como `String`, com validacao no codigo por constantes TypeScript.

Valores esperados principais:

- `User.role`: `ADMIN`, `BARBER`, `CUSTOMER`
- `Appointment.status`: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- `Order.status`: `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- `Coupon.discountType`: `PERCENT`, `FIXED`
- `StockMovement.type`: `IN`, `OUT`

## Scripts uteis

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run seed
npx prisma generate
npx prisma migrate deploy
npx prisma migrate reset
npx prisma db seed
```
