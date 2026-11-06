<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/validate_save.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input', false, null, 0, 4000001);
if (strlen($rawInput) > 4000000) {
    http_response_code(413); echo json_encode(['success' => false, 'error' => 'Partida demasiado grande.']); exit;
}
$data = json_decode($rawInput, true);

if ($validationError = validateSave($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $validationError]);
    exit;
}

$nombreJugador = $data['jugador_nombre'] ?? 'Benkos_Comandante';

try {
    $pdo->beginTransaction();

    // 1. Obtener o crear jugador
    $stmtUser = $pdo->prepare("SELECT id FROM jugadores WHERE nombre = ?");
    $stmtUser->execute([$nombreJugador]);
    $user = $stmtUser->fetch();

    if ($user) {
        $jugadorId = $user['id'];
        $stmtUpdate = $pdo->prepare("UPDATE jugadores SET ultima_partida = NOW() WHERE id = ?");
        $stmtUpdate->execute([$jugadorId]);
    } else {
        $stmtInsertUser = $pdo->prepare("INSERT INTO jugadores (nombre) VALUES (?)");
        $stmtInsertUser->execute([$nombreJugador]);
        $jugadorId = $pdo->lastInsertId();
    }

    // 2. Guardar o actualizar partida
    $partidaId = $data['partida_id'] ?? null;
    $nombrePartida = $data['nombre_partida'] ?? 'Palenque Libre';

    if ($partidaId) {
        $stmtCheck = $pdo->prepare("SELECT id FROM partidas WHERE id = ? AND jugador_id = ?");
        $stmtCheck->execute([$partidaId, $jugadorId]);
        if (!$stmtCheck->fetch()) {
            $partidaId = null;
        }
    }

    if ($partidaId) {
        $sqlPartida = "UPDATE partidas SET
            nombre_partida = :nombre_partida,
            dia_actual = :dia_actual,
            tiempo_dia = :tiempo_dia,
            monedas_bolsa = :monedas_bolsa,
            monedas_cofre = :monedas_cofre,
            salud_benkos = :salud_benkos,
            salud_max_benkos = :salud_max_benkos,
            nivel_palenque = :nivel_palenque,
            totem_ascenso_desbloqueado = :totem_ascenso_desbloqueado,
            armadura_real_desbloqueada = :armadura_real_desbloqueada,
            muralla_izq_hp = :muralla_izq_hp,
            muralla_izq_nivel = :muralla_izq_nivel,
            muralla_der_hp = :muralla_der_hp,
            muralla_der_nivel = :muralla_der_nivel,
            torre_izq_nivel = :torre_izq_nivel,
            torre_der_nivel = :torre_der_nivel,
            posicion_benkos_x = :posicion_benkos_x,
            fugitivos_liberados = :fugitivos_liberados,
            enemigos_derrotados = :enemigos_derrotados,
            puntuacion_total = :puntuacion_total,
            fecha_guardado = NOW()
            WHERE id = :id";
        $stmtPartida = $pdo->prepare($sqlPartida);
        $stmtPartida->execute([
            ':id' => $partidaId,
            ':nombre_partida' => $nombrePartida,
            ':dia_actual' => $data['dia_actual'] ?? 1,
            ':tiempo_dia' => $data['tiempo_dia'] ?? 0.0,
            ':monedas_bolsa' => $data['monedas_bolsa'] ?? 4,
            ':monedas_cofre' => $data['monedas_cofre'] ?? 0,
            ':salud_benkos' => $data['salud_benkos'] ?? 100,
            ':salud_max_benkos' => $data['salud_max_benkos'] ?? 100,
            ':nivel_palenque' => $data['nivel_palenque'] ?? 1,
            ':totem_ascenso_desbloqueado' => !empty($data['totem_ascenso_desbloqueado']) ? 1 : 0,
            ':armadura_real_desbloqueada' => !empty($data['armadura_real_desbloqueada']) ? 1 : 0,
            ':muralla_izq_hp' => $data['muralla_izq_hp'] ?? 200,
            ':muralla_izq_nivel' => $data['muralla_izq_nivel'] ?? 1,
            ':muralla_der_hp' => $data['muralla_der_hp'] ?? 200,
            ':muralla_der_nivel' => $data['muralla_der_nivel'] ?? 1,
            ':torre_izq_nivel' => $data['torre_izq_nivel'] ?? 1,
            ':torre_der_nivel' => $data['torre_der_nivel'] ?? 1,
            ':posicion_benkos_x' => $data['posicion_benkos_x'] ?? 1200.0,
            ':fugitivos_liberados' => $data['fugitivos_liberados'] ?? 0,
            ':enemigos_derrotados' => $data['enemigos_derrotados'] ?? 0,
            ':puntuacion_total' => $data['puntuacion_total'] ?? 0,
        ]);
    } else {
        $sqlPartida = "INSERT INTO partidas (
            jugador_id, nombre_partida, dia_actual, tiempo_dia, monedas_bolsa, monedas_cofre,
            salud_benkos, salud_max_benkos, nivel_palenque, totem_ascenso_desbloqueado, armadura_real_desbloqueada,
            muralla_izq_hp, muralla_izq_nivel, muralla_der_hp, muralla_der_nivel,
            torre_izq_nivel, torre_der_nivel, posicion_benkos_x,
            fugitivos_liberados, enemigos_derrotados, puntuacion_total
        ) VALUES (
            :jugador_id, :nombre_partida, :dia_actual, :tiempo_dia, :monedas_bolsa, :monedas_cofre,
            :salud_benkos, :salud_max_benkos, :nivel_palenque, :totem_ascenso_desbloqueado, :armadura_real_desbloqueada,
            :muralla_izq_hp, :muralla_izq_nivel, :muralla_der_hp, :muralla_der_nivel,
            :torre_izq_nivel, :torre_der_nivel, :posicion_benkos_x,
            :fugitivos_liberados, :enemigos_derrotados, :puntuacion_total
        )";
        $stmtPartida = $pdo->prepare($sqlPartida);
        $stmtPartida->execute([
            ':jugador_id' => $jugadorId,
            ':nombre_partida' => $nombrePartida,
            ':dia_actual' => $data['dia_actual'] ?? 1,
            ':tiempo_dia' => $data['tiempo_dia'] ?? 0.0,
            ':monedas_bolsa' => $data['monedas_bolsa'] ?? 4,
            ':monedas_cofre' => $data['monedas_cofre'] ?? 0,
            ':salud_benkos' => $data['salud_benkos'] ?? 100,
            ':salud_max_benkos' => $data['salud_max_benkos'] ?? 100,
            ':nivel_palenque' => $data['nivel_palenque'] ?? 1,
            ':totem_ascenso_desbloqueado' => !empty($data['totem_ascenso_desbloqueado']) ? 1 : 0,
            ':armadura_real_desbloqueada' => !empty($data['armadura_real_desbloqueada']) ? 1 : 0,
            ':muralla_izq_hp' => $data['muralla_izq_hp'] ?? 200,
            ':muralla_izq_nivel' => $data['muralla_izq_nivel'] ?? 1,
            ':muralla_der_hp' => $data['muralla_der_hp'] ?? 200,
            ':muralla_der_nivel' => $data['muralla_der_nivel'] ?? 1,
            ':torre_izq_nivel' => $data['torre_izq_nivel'] ?? 1,
            ':torre_der_nivel' => $data['torre_der_nivel'] ?? 1,
            ':posicion_benkos_x' => $data['posicion_benkos_x'] ?? 1200.0,
            ':fugitivos_liberados' => $data['fugitivos_liberados'] ?? 0,
            ':enemigos_derrotados' => $data['enemigos_derrotados'] ?? 0,
            ':puntuacion_total' => $data['puntuacion_total'] ?? 0,
        ]);
        $partidaId = $pdo->lastInsertId();
    }

    // 3. Reemplazar tropas asociadas a esta partida
    $pdo->prepare("DELETE FROM partida_tropas WHERE partida_id = ?")->execute([$partidaId]);
    if (!empty($data['tropas']) && is_array($data['tropas'])) {
        $stmtTropa = $pdo->prepare("INSERT INTO partida_tropas
            (partida_id, tipo_unidad, tier, salud_actual, posicion_x, estado_fsm)
            VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($data['tropas'] as $t) {
            $stmtTropa->execute([
                $partidaId,
                $t['tipo_unidad'] ?? 'ALDEANO',
                $t['tier'] ?? 1,
                $t['salud_actual'] ?? 100,
                $t['posicion_x'] ?? 1200,
                $t['estado_fsm'] ?? 'IDLE'
            ]);
        }
    }

    // 4. Reemplazar construcciones asociadas
    $pdo->prepare("DELETE FROM partida_construcciones WHERE partida_id = ?")->execute([$partidaId]);
    if (!empty($data['construcciones']) && is_array($data['construcciones'])) {
        $stmtConst = $pdo->prepare("INSERT INTO partida_construcciones
            (partida_id, tipo_nodo, nivel, posicion_x, salud_actual)
            VALUES (?, ?, ?, ?, ?)");
        foreach ($data['construcciones'] as $c) {
            $stmtConst->execute([
                $partidaId,
                $c['tipo_nodo'] ?? 'HOGUERA_CENTRAL',
                $c['nivel'] ?? 1,
                $c['posicion_x'] ?? 1200,
                $c['salud_actual'] ?? 500
            ]);
        }
    }

    if (isset($data['save_version'])) {
        $stmtState = $pdo->prepare('INSERT INTO partida_estados (partida_id, save_version, saved_at, estado_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE save_version = VALUES(save_version), saved_at = VALUES(saved_at), estado_json = VALUES(estado_json)');
        $stmtState->execute([$partidaId, $data['save_version'], $data['saved_at'], json_encode($data['snapshot'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
    } else {
        $pdo->prepare('DELETE FROM partida_estados WHERE partida_id = ?')->execute([$partidaId]);
    }
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Partida guardada exitosamente en la base de datos MySQL XAMPP',
        'partida_id' => (int)$partidaId,
        'jugador_id' => (int)$jugadorId,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'No se pudo guardar. Revisa la conexión y ejecuta la migración de la versión 4.'
    ]);
}
