# Autenticação

Autenticação Supabase compartilhada por Financeiro e NOT. Exporta `AuthGate`, o cliente Supabase e estilos do acesso. O componente recebe `appName`, `mark` e `description`, mantendo o padrão do Financeiro quando omitidos.

Ambos os apps usam a mesma origem e projeto Supabase, portanto a sessão persiste na alternância. Nenhum token é passado por URL e nenhuma chave privilegiada é exposta. Permissão no app é validada também pelo banco, separadamente da autenticação.
