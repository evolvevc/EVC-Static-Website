# Local interactive entry only. This file never writes a credential to disk.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$localCredential = Read-Host 'Paste existing Resend API key (hidden; do not use a transcript)' -AsSecureString
$localCredentialPointer = [IntPtr]::Zero
try {
    $localCredentialPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($localCredential)
    $env:EVC_LOCAL_RESEND_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($localCredentialPointer)
    & node './one-email-local.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Local email harness stopped. No automatic retry.' }
} finally {
    Remove-Item Env:EVC_LOCAL_RESEND_KEY -ErrorAction SilentlyContinue
    if ($localCredentialPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($localCredentialPointer) }
    $localCredential.Dispose()
}
