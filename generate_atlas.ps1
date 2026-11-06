$ErrorActionPreference = 'Stop'
# One canonical pipeline, shared with npm run atlas:build.
& python (Join-Path $PSScriptRoot 'tools/export_atlas.py')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& python (Join-Path $PSScriptRoot 'tools/check_atlas.py')
exit $LASTEXITCODE
