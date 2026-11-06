<?php
// CLI only, additive migration. Does not replace existing data or re-seed catalogs.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../api/db.php';
$pdo->exec(file_get_contents(__DIR__ . '/../migrations/002_complete_saves.sql'));
echo "Migración de guardado completo aplicada. Las partidas existentes se conservaron.\n";
