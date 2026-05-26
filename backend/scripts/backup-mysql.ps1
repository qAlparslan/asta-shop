# MySQL tam yedek — örnek. Ortamınıza göre yol kullanıcı ve şifre düzenleyin.
# Kullanım: .\backup-mysql.ps1
# Görev Zamanlayıcı: günlük çalıştırılabilir.

$ErrorActionPreference = 'Stop'

$MysqlBin = $env:MYSQLDUMP_PATH
if (-not $MysqlBin) {
  $MysqlBin = 'mysqldump'
}

$dbHost = $env:DB_HOST
if (-not $dbHost) { $dbHost = '127.0.0.1' }
$dbPort = $env:DB_PORT
if (-not $dbPort) { $dbPort = '3306' }
$dbUser = $env:DB_USER
$dbName = $env:DB_NAME

if (-not $dbUser -or -not $dbName) {
  Write-Host "DB_USER ve DB_NAME ortamdan okunmalı (.env yüklü bir shell'den çalıştırın)."
  exit 1
}

$outDir = Join-Path $PSScriptRoot '..' '..' 'backups'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$plainFile = Join-Path $outDir "mysql-$dbName-$stamp.sql"

$env:MYSQL_PWD = $env:DB_PASS
& $MysqlBin `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --single-transaction `
  --routines `
  --triggers `
  $dbName `
  --result-file=$plainFile

if ($LASTEXITCODE -ne 0) {
  Write-Host 'mysqldump başarısız.'
  exit $LASTEXITCODE
}

Write-Host "Yedek yazıldı: $plainFile"
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
