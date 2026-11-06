<?php
/**
 * Benkos: El Palenque de la Matuna - Configuration API Endpoint
 * Handles reading and updating game settings in MySQL configuracion_juego.
 */

require_once __DIR__ . '/db.php';

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT clave, valor, descripcion FROM configuracion_juego");
        $rows = $stmt->fetchAll();
        $config = [];
        foreach ($rows as $r) {
            $config[$r['clave']] = $r['valor'];
        }
        sendJsonResponse([
            'success' => true,
            'config' => $config,
            'details' => $rows
        ]);
    } catch (PDOException $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !is_array($data)) {
        sendJsonResponse(['success' => false, 'error' => 'Cuerpo JSON no válido'], 400);
    }

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("
            INSERT INTO configuracion_juego (clave, valor, descripcion)
            VALUES (:clave, :valor, :descripcion)
            ON DUPLICATE KEY UPDATE valor = VALUES(valor)
        ");

        // Single key-value pair or multiple
        if (isset($data['clave']) && isset($data['valor'])) {
            $stmt->execute([
                ':clave' => $data['clave'],
                ':valor' => (string)$data['valor'],
                ':descripcion' => $data['descripcion'] ?? 'Configuración de usuario'
            ]);
        } else {
            foreach ($data as $k => $v) {
                if (is_scalar($v)) {
                    $stmt->execute([
                        ':clave' => (string)$k,
                        ':valor' => (string)$v,
                        ':descripcion' => 'Ajuste del jugador'
                    ]);
                }
            }
        }

        $pdo->commit();
        sendJsonResponse(['success' => true, 'message' => 'Configuración actualizada']);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['error' => 'Método no soportado'], 405);
