<?php
require_once __DIR__ . '/db.php';

$nombreJugador = $_GET['jugador'] ?? 'Benkos_Comandante';
$partidaId = isset($_GET['partida_id']) ? (int)$_GET['partida_id'] : null;

try {
    if ($partidaId) {
        $stmt = $pdo->prepare("SELECT p.*, j.nombre as jugador_nombre
            FROM partidas p
            JOIN jugadores j ON p.jugador_id = j.id
            WHERE p.id = ? AND j.nombre = ?");
        $stmt->execute([$partidaId, $nombreJugador]);
        $partida = $stmt->fetch();
    } else {
        // Cargar última partida del jugador
        $stmt = $pdo->prepare("SELECT p.*, j.nombre as jugador_nombre
            FROM partidas p
            JOIN jugadores j ON p.jugador_id = j.id
            WHERE j.nombre = ?
            ORDER BY p.fecha_guardado DESC LIMIT 1");
        $stmt->execute([$nombreJugador]);
        $partida = $stmt->fetch();
    }

    if (!$partida) {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró ninguna partida guardada.',
            'partida' => null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Obtener tropas de la partida
    $stmtTropas = $pdo->prepare("SELECT tipo_unidad, tier, salud_actual, posicion_x, estado_fsm
        FROM partida_tropas WHERE partida_id = ?");
    $stmtTropas->execute([$partida['id']]);
    $tropas = $stmtTropas->fetchAll();

    // Obtener construcciones de la partida
    $stmtConst = $pdo->prepare("SELECT tipo_nodo, nivel, posicion_x, salud_actual
        FROM partida_construcciones WHERE partida_id = ?");
    $stmtConst->execute([$partida['id']]);
    $construcciones = $stmtConst->fetchAll();

    $stateStmt = $pdo->prepare('SELECT save_version, saved_at, estado_json FROM partida_estados WHERE partida_id = ?');
    $stateStmt->execute([$partida['id']]);
    $completeState = $stateStmt->fetch();

    echo json_encode([
        'success' => true,
        'partida' => [
            'id' => (int)$partida['id'],
            'save_version' => $completeState ? (int)$completeState['save_version'] : 1,
            'saved_at' => $completeState ? $completeState['saved_at'] : null,
            'snapshot' => $completeState ? json_decode($completeState['estado_json'], true) : null,
            'jugador_nombre' => $partida['jugador_nombre'],
            'nombre_partida' => $partida['nombre_partida'],
            'dia_actual' => (int)$partida['dia_actual'],
            'tiempo_dia' => (float)$partida['tiempo_dia'],
            'monedas_bolsa' => (int)$partida['monedas_bolsa'],
            'monedas_cofre' => (int)$partida['monedas_cofre'],
            'salud_benkos' => (int)$partida['salud_benkos'],
            'salud_max_benkos' => (int)$partida['salud_max_benkos'],
            'nivel_palenque' => (int)$partida['nivel_palenque'],
            'totem_ascenso_desbloqueado' => (bool)$partida['totem_ascenso_desbloqueado'],
            'armadura_real_desbloqueada' => (bool)$partida['armadura_real_desbloqueada'],
            'muralla_izq_hp' => (int)$partida['muralla_izq_hp'],
            'muralla_izq_nivel' => (int)$partida['muralla_izq_nivel'],
            'muralla_der_hp' => (int)$partida['muralla_der_hp'],
            'muralla_der_nivel' => (int)$partida['muralla_der_nivel'],
            'torre_izq_nivel' => (int)$partida['torre_izq_nivel'],
            'torre_der_nivel' => (int)$partida['torre_der_nivel'],
            'posicion_benkos_x' => (float)$partida['posicion_benkos_x'],
            'fugitivos_liberados' => (int)$partida['fugitivos_liberados'],
            'enemigos_derrotados' => (int)$partida['enemigos_derrotados'],
            'puntuacion_total' => (int)$partida['puntuacion_total'],
            'fecha_guardado' => $partida['fecha_guardado'],
            'tropas' => $tropas,
            'construcciones' => $construcciones
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'No se pudo cargar la partida. Revisa la conexión y la migración de la versión 4.'
    ]);
}
