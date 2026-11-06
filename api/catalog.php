<?php
require_once __DIR__ . '/db.php';

try {
    $stmtUnits = $pdo->query("SELECT * FROM catalogo_unidades ORDER BY rama, tier, coste_monedas");
    $units = $stmtUnits->fetchAll();

    $stmtConst = $pdo->query("SELECT * FROM catalogo_construcciones ORDER BY tipo_estructura, nivel");
    $constructions = $stmtConst->fetchAll();

    $stmtConfig = $pdo->query("SELECT clave, valor FROM configuracion_juego");
    $configRaw = $stmtConfig->fetchAll();
    $config = [];
    foreach ($configRaw as $row) {
        $config[$row['clave']] = $row['valor'];
    }

    echo json_encode([
        'success' => true,
        'unidades' => $units,
        'construcciones' => $constructions,
        'configuracion' => $config
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
