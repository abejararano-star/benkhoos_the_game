<?php
require_once __DIR__ . '/db.php';

try {
    $stmtUnits = $pdo->query("SELECT COUNT(*) as total FROM catalogo_unidades");
    $totalUnits = $stmtUnits->fetch()['total'];

    $stmtConst = $pdo->query("SELECT COUNT(*) as total FROM catalogo_construcciones");
    $totalConst = $stmtConst->fetch()['total'];

    $stmtPlayers = $pdo->query("SELECT COUNT(*) as total FROM jugadores");
    $totalPlayers = $stmtPlayers->fetch()['total'];

    $stmtSaves = $pdo->query("SELECT COUNT(*) as total FROM partidas");
    $totalSaves = $stmtSaves->fetch()['total'];

    echo json_encode([
        'success' => true,
        'message' => 'Base de datos benkhoos_the_game conectada con éxito en XAMPP',
        'stats' => [
            'unidades_catalogo' => (int)$totalUnits,
            'construcciones_catalogo' => (int)$totalConst,
            'jugadores_registrados' => (int)$totalPlayers,
            'partidas_guardadas' => (int)$totalSaves,
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
