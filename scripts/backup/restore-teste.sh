#!/usr/bin/env bash
#
# Verificação mensal do backup — roda NA VM Oracle, à mão.
#
# Restaura o dump mais recente numa base descartável e compara com a base viva.
# Backup que nunca foi restaurado não é backup: é um arquivo com nome bonito.
#
# Uso:  ./restore-teste.sh [-y]      (-y pula a confirmação, para uso em cron)
#
set -Eeuo pipefail

DB_NAME="${COREFIN_DB:-financial_data}"
DB_TESTE="${COREFIN_DB_TESTE:-${DB_NAME}_restore_test}"
DEST_DIR="${COREFIN_BACKUP_DIR:-/var/backups/corefin}"
DEFAULTS_FILE="${COREFIN_DEFAULTS_FILE:-$HOME/.corefin-backup.cnf}"

CONFIRMADO=0
[[ "${1:-}" == "-y" ]] && CONFIRMADO=1

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Trava contra apontar isto para a base de produção por engano.
if [[ "$DB_TESTE" != *_restore_test ]]; then
  log "ERRO: a base de teste precisa terminar em '_restore_test' (recebi '$DB_TESTE')"
  exit 1
fi
if [[ "$DB_TESTE" == "$DB_NAME" ]]; then
  log "ERRO: base de teste igual à base real"
  exit 1
fi

[[ -f "$DEFAULTS_FILE" ]] || { log "ERRO: '$DEFAULTS_FILE' não existe (ver README.md)"; exit 1; }

mysql_cmd() { mysql --defaults-extra-file="$DEFAULTS_FILE" "$@"; }

DUMP="$(find "$DEST_DIR" -maxdepth 1 -name "corefin-$DB_NAME-*.sql.gz" -printf '%T@ %p\n' \
        | sort -rn | head -1 | cut -d' ' -f2-)"
[[ -n "$DUMP" ]] || { log "ERRO: nenhum dump encontrado em $DEST_DIR"; exit 1; }

IDADE_DIAS=$(( ( $(date +%s) - $(stat -c %Y "$DUMP") ) / 86400 ))
log "dump mais recente: $DUMP (${IDADE_DIAS} dia(s) de idade)"

if (( CONFIRMADO == 0 )); then
  read -r -p "Vou APAGAR e recriar a base '$DB_TESTE'. Continuar? [s/N] " resposta
  [[ "$resposta" == "s" || "$resposta" == "S" ]] || { log "cancelado"; exit 0; }
fi

log "recriando '$DB_TESTE'"
mysql_cmd -e "DROP DATABASE IF EXISTS \`$DB_TESTE\`;
              CREATE DATABASE \`$DB_TESTE\` CHARACTER SET utf8mb4;"

log "restaurando…"
zcat "$DUMP" | mysql_cmd "$DB_TESTE"
log "restauração concluída sem erro"

# ------------------------------------------------------- comparação com a base viva
log "comparando tabelas com '$DB_NAME'"
FALHAS=0

printf '\n%-20s %12s %12s\n' "TABELA" "REAL" "RESTAURADA"
printf '%-20s %12s %12s\n' "--------------------" "------------" "------------"

while read -r tabela; do
  n_real="$(mysql_cmd -N -B -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$tabela\`;")"
  if ! n_teste="$(mysql_cmd -N -B -e "SELECT COUNT(*) FROM \`$DB_TESTE\`.\`$tabela\`;" 2>/dev/null)"; then
    printf '%-20s %12s %12s   <== AUSENTE NO BACKUP\n' "$tabela" "$n_real" "-"
    FALHAS=$((FALHAS + 1))
    continue
  fi
  printf '%-20s %12s %12s\n' "$tabela" "$n_real" "$n_teste"
done < <(mysql_cmd -N -B -e "SELECT TABLE_NAME FROM information_schema.TABLES
                             WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_TYPE='BASE TABLE'
                             ORDER BY TABLE_NAME;")

echo
# Diferença pequena de contagem é normal: o dump é de um instante anterior e a
# base viva continuou recebendo lançamentos. O que não pode é tabela faltando
# ou a principal vir vazia.
N_TRANSACOES="$(mysql_cmd -N -B -e "SELECT COUNT(*) FROM \`$DB_TESTE\`.transactions;" 2>/dev/null || echo 0)"
if (( N_TRANSACOES == 0 )); then
  log "ERRO: 'transactions' restaurou vazia"
  FALHAS=$((FALHAS + 1))
fi

if (( FALHAS > 0 )); then
  log "RESULTADO: $FALHAS problema(s) — este backup NÃO serve para restaurar"
  exit 1
fi

log "RESULTADO: backup íntegro e restaurável."
log "A base '$DB_TESTE' foi mantida para inspeção — apague quando terminar:"
log "  mysql --defaults-extra-file=$DEFAULTS_FILE -e \"DROP DATABASE \\\`$DB_TESTE\\\`;\""
