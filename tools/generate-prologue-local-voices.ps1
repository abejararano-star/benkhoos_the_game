$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime] | Out-Null

$generator = Join-Path $PSScriptRoot 'generate-prologue-voices.js'
$scriptJson = & node $generator --script-json
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el guion del prólogo.' }
$lines = $scriptJson | ConvertFrom-Json
$directory = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/prologue-local'
New-Item -ItemType Directory -Path $directory -Force | Out-Null

$spanish = @([Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices |
    Where-Object Language -Match '^es(-|$)')
if (-not $spanish.Count) { throw 'Instala una voz de español en la configuración de Windows.' }
$male = $spanish | Where-Object Gender -eq 'Male' | Select-Object -First 1
$female = $spanish | Where-Object Gender -eq 'Female' | Select-Object -First 1
if (-not $male) { $male = $spanish[0] }
if (-not $female) { $female = $spanish[0] }
$readings = @{
    abuelo = @{ Voice = $male; Pitch = '-15%'; Rate = '-11%' }
    nino = @{ Voice = $male; Pitch = '+20%'; Rate = '+6%' }
    benkos = @{ Voice = $male; Pitch = '+0%'; Rate = '-2%' }
    narrador = @{ Voice = $female; Pitch = '+0%'; Rate = '-3%' }
    wiwa = @{ Voice = $male; Pitch = '-7%'; Rate = '-7%' }
}
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation' + [char]96 + '1'
} | Select-Object -First 1
$asSpeechTask = $asTask.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$synthesizer = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
try {
    foreach ($line in $lines) {
        $reading = $readings[$line.role]
        $synthesizer.Voice = $reading.Voice
        $text = [Security.SecurityElement]::Escape($line.text)
        $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{0}"><prosody rate="{1}" pitch="{2}">{3}</prosody></speak>' -f $reading.Voice.Language,$reading.Rate,$reading.Pitch,$text
        $task = $asSpeechTask.Invoke($null, @($synthesizer.SynthesizeSsmlToStreamAsync($ssml)))
        $stream = $task.GetAwaiter().GetResult()
        $inputStream = [IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
        $destination = Join-Path $directory ($line.id + '.wav')
        $file = [IO.File]::Create($destination)
        try { $inputStream.CopyTo($file) } finally { $file.Dispose(); $inputStream.Dispose() }
        Write-Output $line.id
    }
} finally {
    $synthesizer.Dispose()
}
& node $generator --index-only
if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar el índice multimedia.' }
