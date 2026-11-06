<?php
if (PHP_SAPI !== 'cli' || !preg_match('/^Benkhoos_QA_[0-9]{13}$/', $argv[1] ?? '')) exit(1);
require __DIR__ . '/../api/db.php';
$stmt = $pdo->prepare('DELETE FROM jugadores WHERE nombre = ?');
$stmt->execute([$argv[1]]);
echo "Temporary QA profile removed.\n";
