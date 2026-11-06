<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Payload JSON inválido']);
        exit;
    }

    $nombreJugador = $data['jugador_nombre'] ?? 'Benkos_Comandante';

    try {
        // Obtener o crear jugador
        $stmtUser = $pdo->prepare("SELECT id FROM jugadores WHERE nombre = ?");
        $stmtUser->execute([$nombreJugador]);
        $user = $stmtUser->fetch();
        if ($user) {
            $jugadorId = $user['id'];
        } else {
            $stmtInsert = $pdo->prepare("INSERT INTO jugadores (nombre) VALUES (?)");
            $stmtInsert->execute([$nombreJugador]);
            $jugadorId = $pdo->lastInsertId();
        }

        $stmtScore = $pdo->prepare("INSERT INTO bitacora_victorias
            (jugador_id, dias_sobrevividos, tropas_reclutadas, oleadas_repelidas, jefes_derrotados, plata_total_acumulada, puntuacion_final, victoria_conseguida)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtScore->execute([
            $jugadorId,
            $data['dias_sobrevividos'] ?? 1,
            $data['tropas_reclutadas'] ?? 0,
            $data['oleadas_repelidas'] ?? 0,
            $data['jefes_derrotados'] ?? 0,
            $data['plata_total_acumulada'] ?? 0,
            $data['puntuacion_final'] ?? 0,
            !empty($data['victoria_conseguida']) ? 1 : 0
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Bitácora de campaña registrada con éxito',
            'registro_id' => (int)$pdo->lastInsertId()
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// GET: Salón de la Fama / Leaderboard
try {
    $sql = "SELECT b.id, j.nombre as jugador, b.dias_sobrevividos, b.tropas_reclutadas,
            b.oleadas_repelidas, b.jefes_derrotados, b.plata_total_acumulada, b.puntuacion_final,
            b.victoria_conseguida, b.fecha_registro
            FROM bitacora_victorias b
            JOIN jugadores j ON b.jugador_id = j.id
            ORDER BY b.puntuacion_final DESC, b.dias_sobrevividos DESC
            LIMIT 15";
    $stmt = $pdo->query($sql);
    $records = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'leaderboard' => $records
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
