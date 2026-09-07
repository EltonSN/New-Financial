#!/usr/bin/env bash
#
# Backup diário da base do CoreFin — roda NA VM Oracle, via cron.
#
# Gera um dump completo (estrutura + dados) comprimido em $DEST_DIR, verifica a
# integridade do arquivo antes de considerá-lo válido e só então rotaciona os
# antigos. A máquina Windows puxa esse arquivo depois (Get-CoreFinBackup.ps1).
#
# A senha do MySQL NÃO vem por parâmetro nem por variável: vem de um arquivo de
# credenciais com permissão 600 (ver README.md). Senha na linha de comando fica
# visível para qualquer usuário da VM no `ps`.
#
# Uso:  ./backup.sh          (as configurações vêm das variáveis abaixo)
#
set -Eeuo pipefail

DB_NAME="${COREFIN_DB:-financial_data}"
DEST_DIR="${COREFIN_BACKUP_DIR:-/var/backups/corefin}"
RETENCAO_DIAS="${COREFIN_RETENCAO_DIAS:-30}"
DEFAULTS_FILE="${COREFIN_DEFAULTS_FILE:-$HOME/.corefin-backup.cnf}"
LOG_FILE="${COREFIN_LOG:-/var/log/corefin-backup.log}"
MIN_LIVRE_MB="${COREFIN_MIN_LIVRE_MB:-512}"

DATA="$(date +%Y-%m-%d)"
ARQUIVO="$DEST_DIR/corefin-$DB_NAME-$DATA.sql.gz"
PARCIAL="$ARQUIVO.parcial"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
falhou() {
  log "ERRO na linha $1 — backup NÃO concluído, nada foi rotacionado"
  # o arquivo pela metade não fica para trás confundindo a próxima execução
  rm -f "${PARCIAL:-}"
}
trap 'falhou "$LINENO"' ERR

# Log em arquivo quando possível; senão só no stdout (o cron captura).
if touch "$LOG_FILE" 2>/dev/null; then
  exec > >(tee -a "$LOG_FILE") 2>&1
fi

log "=== início do backup de '$DB_NAME' ==="

# ---------------------------------------------------------------- pré-checagens
command -v mysqldump >/dev/null || { log "ERRO: mysqldump não encontrado no PATH"; exit 1; }

if [[ ! -f "$DEFAULTS_FILE" ]]; then
  log "ERRO: arquivo de credenciais '$DEFAULTS_FILE' não existe (ver README.md)"
  exit 1
fi

# 600 = só o dono lê. Recusar credencial frouxa é de propósito.
PERM="$(stat -c '%a' "$DEFAULTS_FILE")"
if [[ "$PERM" != "600" && "$PERM" != "400" ]]; then
  log "ERRO: '$DEFAULTS_FILE' está com permissão $PERM — precisa ser 600 (chmod 600)"
  exit 1
fi

mkdir -p "$DEST_DIR"

LIVRE_MB="$(df -Pm "$DEST_DIR" | awk 'NR==2 {print $4}')"
if (( LIVRE_MB < MIN_LIVRE_MB )); then
  log "ERRO: só ${LIVRE_MB}MB livres em '$DEST_DIR' (mínimo ${MIN_LIVRE_MB}MB)"
  exit 1
fi

# Sobras de execuções interrompidas não devem ser confundidas com backup bom.
find "$DEST_DIR" -maxdepth 1 -name '*.sql.gz.parcial' -mmin +60 -delete 2>/dev/null || true

# ------------------------------------------------------------------------ dump
# Escreve em .parcial e só renomeia no fim: em nenhum momento existe um arquivo
# com nome definitivo e conteúdo incompleto.
#
# Sem --databases de propósito: o dump não carrega CREATE DATABASE/USE, então
# pode ser restaurado em qualquer base — inclusive na de teste mensal.
log "gerando dump em $PARCIAL"
mysqldump \
  --defaults-extra-file="$DEFAULTS_FILE" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --no-tablespaces \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$PARCIAL"

# ------------------------------------------------------------------- validação
log "validando o arquivo gerado"

gzip -t "$PARCIAL" || { log "ERRO: gzip corrompido"; rm -f "$PARCIAL"; exit 1; }

# mysqldump só escreve esta linha quando termina inteiro. Um dump cortado no meio
# (rede caiu, disco encheu) passa no gzip -t mas não tem esta marca.
if ! zcat "$PARCIAL" | tail -5 | grep -q 'Dump completed'; then
  log "ERRO: dump incompleto — falta a marca 'Dump completed'"
  rm -f "$PARCIAL"
  exit 1
fi

TABELAS="$(zcat "$PARCIAL" | grep -c '^CREATE TABLE' || true)"
if (( TABELAS < 1 )); then
  log "ERRO: o dump não tem nenhum CREATE TABLE"
  rm -f "$PARCIAL"
  exit 1
fi

mv -f "$PARCIAL" "$ARQUIVO"
TAMANHO="$(du -h "$ARQUIVO" | cut -f1)"
log "OK: $ARQUIVO ($TAMANHO, $TABELAS tabelas)"

# -------------------------------------------------------------------- rotação
# Só chega aqui se o backup de hoje está íntegro — nunca apagamos o histórico
# antes de ter um substituto válido.
REMOVIDOS="$(find "$DEST_DIR" -maxdepth 1 -name "corefin-$DB_NAME-*.sql.gz" -mtime "+$RETENCAO_DIAS" -print -delete | wc -l)"
log "rotação: $REMOVIDOS arquivo(s) com mais de $RETENCAO_DIAS dias removido(s)"

TOTAL="$(find "$DEST_DIR" -maxdepth 1 -name "corefin-$DB_NAME-*.sql.gz" | wc -l)"
log "=== fim: $TOTAL backup(s) em $DEST_DIR ==="
