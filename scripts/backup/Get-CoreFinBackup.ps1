<#
.SYNOPSIS
    Puxa o backup mais recente do CoreFin da VM Oracle para a pasta sincronizada
    com o Google Drive. Roda NA MÁQUINA WINDOWS, pelo Agendador de Tarefas.

.DESCRIPTION
    O dump é gerado na VM por backup.sh. Este script só transporta: pergunta à VM
    qual é o arquivo mais recente, baixa se ainda não existir localmente, confere
    o tamanho, rotaciona os antigos e avisa se o backup mais novo estiver velho
    demais — porque o modo mais comum de um backup falhar é parar de acontecer
    sem ninguém perceber.

.PARAMETER VmHost
    IP ou hostname da VM. Obrigatório — de propósito não fica versionado aqui.

.EXAMPLE
    .\Get-CoreFinBackup.ps1 -VmHost 203.0.113.10

.NOTES
    Requer o cliente OpenSSH do Windows (ssh.exe / scp.exe), presente por padrão
    no Windows 10/11. Ver README.md para o registro da tarefa agendada.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$VmHost,

    [string]$VmUser        = 'ubuntu',
    [string]$SshKey        = "$env:USERPROFILE\.ssh\corefin_vm",
    [string]$RemoteDir     = '/var/backups/corefin',
    [string]$LocalDir      = "$env:USERPROFILE\Documents\Create\CoreFin-Backups",
    [int]   $RetencaoDias  = 30,
    [int]   $AvisoDias     = 2
)

$ErrorActionPreference = 'Stop'
$LogFile = Join-Path $LocalDir 'Get-CoreFinBackup.log'

function Write-Log {
    param([string]$Mensagem, [string]$Nivel = 'INFO')
    $linha = '{0}  [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Nivel, $Mensagem
    Write-Host $linha
    if (Test-Path -LiteralPath $LocalDir) { Add-Content -LiteralPath $LogFile -Value $linha }
}

try {
    if (-not (Test-Path -LiteralPath $LocalDir)) {
        New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null
    }
    Write-Log "=== início — origem ${VmUser}@${VmHost}:${RemoteDir} ==="

    if (-not (Test-Path -LiteralPath $SshKey)) {
        throw "Chave SSH não encontrada em '$SshKey'."
    }
    foreach ($exe in 'ssh.exe', 'scp.exe') {
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
            throw "'$exe' não está no PATH. Instale o Cliente OpenSSH (Configurações > Recursos Opcionais)."
        }
    }

    $destino = "${VmUser}@${VmHost}"
    # accept-new confia na chave do host no primeiro contato e passa a exigir a
    # mesma depois; sem isto a tarefa agendada trava esperando um "yes".
    $sshArgs = @('-i', $SshKey, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')

    # ------------------------------------------------- qual é o dump mais recente
    $remoto = & ssh.exe @sshArgs $destino "ls -1t $RemoteDir/corefin-*.sql.gz 2>/dev/null | head -1"
    if ($LASTEXITCODE -ne 0) { throw "Falha ao conectar na VM (código $LASTEXITCODE)." }
    $remoto = ($remoto | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($remoto)) { throw "Nenhum dump encontrado em ${RemoteDir} na VM." }

    $nomeArquivo   = Split-Path $remoto -Leaf
    $caminhoLocal  = Join-Path $LocalDir $nomeArquivo
    $tamanhoRemoto = [int64](& ssh.exe @sshArgs $destino "stat -c %s '$remoto'" | Out-String).Trim()

    # ------------------------------------------------------------------ download
    if ((Test-Path -LiteralPath $caminhoLocal) -and
        ((Get-Item -LiteralPath $caminhoLocal).Length -eq $tamanhoRemoto)) {
        Write-Log "$nomeArquivo já está completo localmente — nada a baixar"
    }
    else {
        # Baixa para .parcial e só renomeia no fim: o Drive nunca sincroniza um
        # arquivo pela metade com nome de backup bom.
        $parcial = "$caminhoLocal.parcial"
        Write-Log "baixando $nomeArquivo ($([math]::Round($tamanhoRemoto / 1MB, 2)) MB)"
        & scp.exe @sshArgs -p "${destino}:${remoto}" $parcial
        if ($LASTEXITCODE -ne 0) {
            Remove-Item -LiteralPath $parcial -Force -ErrorAction SilentlyContinue
            throw "scp falhou (código $LASTEXITCODE)."
        }

        $tamanhoLocal = (Get-Item -LiteralPath $parcial).Length
        if ($tamanhoLocal -ne $tamanhoRemoto) {
            Remove-Item -LiteralPath $parcial -Force
            throw "Tamanho divergente: remoto $tamanhoRemoto bytes, baixado $tamanhoLocal bytes."
        }

        Move-Item -LiteralPath $parcial -Destination $caminhoLocal -Force
        Write-Log "OK: $caminhoLocal"
    }

    # ------------------------------------------------------------------ rotação
    $limite = (Get-Date).AddDays(-$RetencaoDias)
    $antigos = Get-ChildItem -LiteralPath $LocalDir -Filter 'corefin-*.sql.gz' |
               Where-Object { $_.LastWriteTime -lt $limite }
    foreach ($a in $antigos) { Remove-Item -LiteralPath $a.FullName -Force }
    Write-Log "rotação: $($antigos.Count) arquivo(s) com mais de $RetencaoDias dias removido(s)"

    Get-ChildItem -LiteralPath $LocalDir -Filter '*.parcial' |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-6) } |
        Remove-Item -Force

    # -------------------------------------------------------- backup está velho?
    $maisNovo = Get-ChildItem -LiteralPath $LocalDir -Filter 'corefin-*.sql.gz' |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $total = (Get-ChildItem -LiteralPath $LocalDir -Filter 'corefin-*.sql.gz').Count
    $idade = [math]::Floor(((Get-Date) - $maisNovo.LastWriteTime).TotalDays)

    if ($idade -gt $AvisoDias) {
        Write-Log "backup mais recente tem $idade dia(s) — passou do limite de $AvisoDias" 'AVISO'
        Write-Log "=== fim com AVISO: $total backup(s) em $LocalDir ==="
        exit 2   # o Agendador mostra o código; 2 = baixou, mas o dado está velho
    }

    Write-Log "=== fim: $total backup(s) em $LocalDir, mais recente com $idade dia(s) ==="
    exit 0
}
catch {
    Write-Log $_.Exception.Message 'ERRO'
    exit 1
}
