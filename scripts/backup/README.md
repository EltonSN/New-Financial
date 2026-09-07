# Backup do banco do CoreFin

Rotina de backup **diária**, com retenção de **30 dias**, decidida em 29/08/2026
(ver `Melhorias/Backup` no vault). O desenho é de propósito em dois passos:

```
VM Oracle                              Máquina Windows                Google Drive
─────────                              ───────────────                ────────────
cron 03:15  ─►  backup.sh              Agendador 09:00                sincroniza
                mysqldump + gzip       Get-CoreFinBackup.ps1   ─►     sozinho
                /var/backups/corefin   scp do arquivo do dia
                (retém 30 dias)        Documents\Create\CoreFin-Backups
                                       (retém 30 dias)
```

O dump nasce na VM porque assim ele acontece **mesmo com o PC desligado**, e o
`mysqldump` roda em `localhost` — o histórico financeiro não trafega pela
internet para ser gerado. A máquina Windows só transporta o arquivo para dentro
da pasta que o Drive já sincroniza.

Ficam duas cópias em lugares independentes: a VM e o Drive.

| Arquivo | Onde roda | O que faz |
| --- | --- | --- |
| `backup.sh` | VM Oracle, via cron | gera o dump, valida e rotaciona |
| `Get-CoreFinBackup.ps1` | Windows, via Agendador | baixa o dump do dia e rotaciona |
| `restore-teste.sh` | VM Oracle, à mão | restaura numa base descartável e compara |

**O dump com dados nunca vai para o git.** Só estes scripts são versionados;
`.sql.gz`, senha e IP da VM não.

---

## 1. Instalação na VM Oracle

```bash
sudo mkdir -p /opt/corefin /var/backups/corefin
sudo chown "$USER" /var/backups/corefin
# copie backup.sh e restore-teste.sh para /opt/corefin/ e:
chmod +x /opt/corefin/backup.sh /opt/corefin/restore-teste.sh
```

### Usuário do MySQL só para o backup

Não use o usuário da aplicação. Crie um só de leitura — rode isto no MySQL:

```sql
CREATE USER 'corefin_backup'@'localhost' IDENTIFIED BY 'ESCOLHA_UMA_SENHA';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES
  ON financial_data.* TO 'corefin_backup'@'localhost';
FLUSH PRIVILEGES;
```

Para o `restore-teste.sh` funcionar, esse usuário também precisa poder criar e
escrever na base de teste (e **só** nela):

```sql
GRANT ALL PRIVILEGES ON `financial_data_restore_test`.* TO 'corefin_backup'@'localhost';
GRANT CREATE, DROP ON *.* TO 'corefin_backup'@'localhost';
FLUSH PRIVILEGES;
```

Se preferir manter o usuário de backup estritamente somente-leitura, rode o teste
de restauração com outro usuário (`COREFIN_DEFAULTS_FILE=~/.corefin-restore.cnf`).

### Arquivo de credenciais

A senha **não** entra no script nem em variável de ambiente — senha na linha de
comando aparece no `ps` para qualquer usuário da VM. Ela vive num arquivo 600:

```bash
cat > ~/.corefin-backup.cnf <<'CNF'
[client]
user=corefin_backup
password=ESCOLHA_UMA_SENHA
host=127.0.0.1
CNF
chmod 600 ~/.corefin-backup.cnf
```

O `backup.sh` **recusa rodar** se esse arquivo estiver com permissão diferente de
600/400. É de propósito.

### Primeira execução e cron

```bash
/opt/corefin/backup.sh          # rode uma vez à mão e confira a saída
ls -lh /var/backups/corefin/
crontab -e
```

```cron
# 03:15 todo dia — confira o fuso da VM com `timedatectl`
15 3 * * * /opt/corefin/backup.sh
```

O log vai para `/var/log/corefin-backup.log` quando o usuário do cron tem
permissão de escrita ali; senão, cai no stdout que o cron captura. Para o log não
crescer sem fim:

```bash
sudo tee /etc/logrotate.d/corefin-backup >/dev/null <<'ROT'
/var/log/corefin-backup.log {
    monthly
    rotate 6
    compress
    missingok
    notifempty
}
ROT
```

### Ajustes disponíveis

Tudo por variável de ambiente, sem editar o script:

| Variável | Padrão |
| --- | --- |
| `COREFIN_DB` | `financial_data` |
| `COREFIN_BACKUP_DIR` | `/var/backups/corefin` |
| `COREFIN_RETENCAO_DIAS` | `30` |
| `COREFIN_DEFAULTS_FILE` | `~/.corefin-backup.cnf` |
| `COREFIN_LOG` | `/var/log/corefin-backup.log` |
| `COREFIN_MIN_LIVRE_MB` | `512` |

---

## 2. Instalação na máquina Windows

### Antes: tire a chave SSH da pasta do Drive

Hoje a chave está em `Documents\Create\ssh_key` — dentro da árvore que o Google
Drive sincroniza, ou seja, **a chave privada está subindo para a nuvem**. Mova-a
para fora e restrinja a permissão (o OpenSSH recusa chave que outros usuários
possam ler):

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null
Move-Item "$env:USERPROFILE\Documents\Create\ssh_key" "$env:USERPROFILE\.ssh\corefin_vm"

icacls "$env:USERPROFILE\.ssh\corefin_vm" /inheritance:r
icacls "$env:USERPROFILE\.ssh\corefin_vm" /grant:r "$($env:USERNAME):(R)"
```

Esse caminho já é o padrão do script. Se preferir manter onde está, passe
`-SshKey`.

### Teste manual

```powershell
cd C:\dev\_Create\CoreFin-Project\CoreFin\scripts\backup
.\Get-CoreFinBackup.ps1 -VmHost <IP_DA_VM> -VmUser ubuntu
```

O usuário costuma ser `ubuntu` (imagem Ubuntu) ou `opc` (Oracle Linux).

### Registrar a tarefa agendada

Use `Register-ScheduledTask`, não a GUI: é o `-StartWhenAvailable` que faz a
tarefa rodar assim que o PC liga, quando o horário passou com a máquina
desligada. Sem isso, dia desligado é dia sem cópia no Drive.

```powershell
$script = 'C:\dev\_Create\CoreFin-Project\CoreFin\scripts\backup\Get-CoreFinBackup.ps1'

$acao = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -VmHost <IP_DA_VM>"

$gatilho = New-ScheduledTaskTrigger -Daily -At 09:00

$config = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries

Register-ScheduledTask -TaskName 'CoreFin - Backup diário' `
    -Action $acao -Trigger $gatilho -Settings $config `
    -Description 'Baixa o dump diário do CoreFin da VM Oracle para a pasta sincronizada com o Drive.'
```

### Códigos de saída — é o que o Agendador mostra na coluna "Resultado"

| Código | Significado |
| --- | --- |
| `0` | tudo certo |
| `1` | falhou (sem conexão, chave errada, tamanho divergente) |
| `2` | baixou, mas o backup mais recente tem mais de 2 dias |

O log fica em `Documents\Create\CoreFin-Backups\Get-CoreFinBackup.log`.

---

## 3. Verificação mensal — não pule

Backup que nunca foi restaurado é só um arquivo com nome bonito. Uma vez por mês,
na VM:

```bash
/opt/corefin/restore-teste.sh
```

Ele restaura o dump mais recente em `financial_data_restore_test` e imprime a
contagem de linhas de cada tabela lado a lado com a base real. Diferença pequena
nas contagens é esperada — o dump é de um instante anterior. O que reprova o
teste é **tabela ausente** no backup ou `transactions` vazia.

A base de teste é mantida no fim para inspeção; apague quando terminar.

---

## Detalhes de implementação que valem saber

- **Nada com nome definitivo é escrito pela metade.** Os dois scripts escrevem em
  `.parcial` e só renomeiam depois de validar. Um `.sql.gz` na pasta é sempre um
  backup íntegro.
- **A rotação só roda depois de um backup válido.** Nunca se apaga histórico sem
  ter o substituto na mão.
- **`--single-transaction`** dá um dump consistente em InnoDB sem travar a
  escrita: a API pode continuar gravando enquanto o dump roda.
- **O dump não tem `CREATE DATABASE`/`USE`** (não usamos `--databases`), então
  pode ser restaurado em qualquer base — é o que permite o teste mensal.
- **`Dump completed`**: o `backup.sh` confere essa marca final do `mysqldump`. Um
  dump cortado no meio passa no `gzip -t`, mas não tem essa linha.
- **`--no-tablespaces`** evita exigir o privilégio `PROCESS` do MySQL 8, que o
  usuário de backup não precisa ter.

## Pendências ligadas a esta rotina

- A porta 3306 da VM está aberta para a internet (é como a função da Vercel
  alcança o banco). Esta rotina não depende disso — o dump é local — mas o ponto
  segue aberto em `Melhorias/Segurança`.
- O `Athena EPP Antivirus` já apagou arquivos dentro de `Documents\Create`.
  Inclua `CoreFin-Backups` no pedido de exclusão ao TI (`Melhorias/DevOps`).
