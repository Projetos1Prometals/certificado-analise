/*
  Configuração do banco online (Supabase).

  Onde encontrar: Supabase → seu projeto → Project Settings → API Keys (ou "API").
    url     = "Project URL"           (ex.: https://abcdefgh.supabase.co)
    anonKey = chave "anon / public" ou "publishable" (começa com eyJ... ou sb_publishable_...)

  NUNCA cole aqui a chave "service_role" ou "secret": ela dá acesso total ao banco.
  A chave anon/publishable pode ficar pública: quem protege os dados é o login
  e as regras do arquivo supabase.sql.
*/
window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "COLE_AQUI"
};
