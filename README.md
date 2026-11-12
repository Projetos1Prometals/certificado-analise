# Certificados de Análise — Prometals

Sistema para buscar, editar e imprimir os **Certificados de Qualidade**.
Site: https://gabrielprometals.github.io/certificado-analise/

Os dados ficam no **Supabase**: todos os usuários liberados veem e editam os mesmos certificados, em tempo real. Cada pessoa entra com o próprio e-mail e senha.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | A página (estrutura das telas) |
| `style.css` | O visual (cores, layout do certificado, impressão) |
| `app.js` | O funcionamento (busca, edição, impressão, banco de dados) |
| `config.js` | **URL e chave do Supabase**: único arquivo que precisa ser editado |
| `supabase.sql` | Cria as tabelas e a segurança no Supabase (rodar uma vez) |
| `logo.png` | Logo usada no topo e no certificado |

> Os dados dos clientes e a assinatura **não ficam no GitHub**: ficam no Supabase, protegidos por login.
> Nunca envie para o GitHub arquivos `.json` de backup ou o `configuracao-inicial.json`.

## Configuração (uma vez só)

### 1. Preparar o banco
1. No Supabase, abra o projeto que vai guardar os certificados (pode ser um que você já usa).
2. Abra o arquivo `supabase.sql` e, no final (passo 5), troque `pessoa1@prometals.co` e `pessoa2@prometals.co` pelos e-mails da equipe.
3. No Supabase: **SQL Editor → New query** → cole todo o conteúdo → **Run**.
   Isso cria três tabelas (`certificados_analise`, `certificados_config`, `certificados_usuarios`), a segurança e o tempo real. Não mexe em nenhuma outra tabela do projeto.

### 2. Criar os usuários
1. **Authentication → Users → Add user → Create new user**.
2. E-mail e senha de cada pessoa. Marque **Auto Confirm User**.
3. Use os mesmos e-mails que estão na lista do `supabase.sql`. Só quem está na lista consegue ver os certificados.

### 3. Link de "Esqueci minha senha"
**Authentication → URL Configuration** → em **Redirect URLs**, adicione
`https://gabrielprometals.github.io/certificado-analise/`

### 4. Ligar o site ao Supabase
1. **Project Settings → API Keys** (ou **API**).
2. Copie a **Project URL** e a chave **anon / public** (ou **publishable**, começa com `sb_publishable_`).
   ⚠️ Nunca use a chave **service_role** / **secret**.
3. No GitHub, abra `config.js` → lápis (editar) → cole a URL em `url` e a chave em `anonKey` → **Commit changes**.

### 5. Primeiro acesso
1. Abra o site e entre com um dos usuários.
2. Na faixa **Primeiro acesso**, clique em **Importar arquivo…** e escolha `configuracao-inicial.json` (traz as ligas do Banco de dados e a assinatura).
3. Pronto. Clique em **Nova corrida** para criar o primeiro certificado.

## Uso

- **Busca de OP**: digite a OP e veja em qual corrida ela está. Também busca por corrida, material, cliente, pedido ou nº do certificado. `Enter` abre quando há um só resultado.
- **Certificado**: clique em qualquer campo e digite. Salva sozinho. O que você muda aparece para os outros na hora.
- **Imprimir / PDF**: `Ctrl` + `P` ou botão no alto: A4, mesmo formato da planilha.
- **Banco de dados**: faixas das ligas (conferência na tela) e a **assinatura** dos certificados.
- **Backup**: exporte um `.json` de vez em quando e guarde na rede.
- **Sem internet**: dá para continuar trabalhando com a última cópia. As alterações ficam guardadas no computador e são enviadas quando a conexão voltar.

## Novo usuário
1. **Authentication → Users → Add user** (com Auto Confirm).
2. **Table Editor → certificados_usuarios → Insert row** → o e-mail da pessoa.

Para tirar o acesso de alguém, apague o e-mail da tabela `certificados_usuarios`.

## Observações
- No plano gratuito, o Supabase pausa projetos que ficam 7 dias sem uso. Se acontecer, entre no Supabase e clique em **Restore project**.
- As tabelas podem ser vistas e exportadas pelo **Table Editor** do Supabase. Cada certificado fica numa linha de `certificados_analise` (coluna `dados`).
