<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$localConfig = is_file(__DIR__ . '/config.local.php') ? require __DIR__ . '/config.local.php' : [];
$host = $localConfig['host'] ?? getenv('BENKHOOS_DB_HOST') ?: '127.0.0.1';
$dbname = $localConfig['database'] ?? getenv('BENKHOOS_DB_NAME') ?: 'benkhoos_the_game';
$username = $localConfig['user'] ?? getenv('BENKHOOS_DB_USER') ?: 'root';
$password = $localConfig['password'] ?? getenv('BENKHOOS_DB_PASSWORD') ?: '';

if (PHP_SAPI !== 'cli' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // This application is a local PC game; require same-origin JSON writes.
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $originHost = $origin ? parse_url($origin, PHP_URL_HOST) : null;
    $requestHost = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if ($originHost !== null && $originHost !== $requestHost) {
        http_response_code(403); echo json_encode(['success' => false, 'error' => 'Origen no permitido']); exit;
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        http_response_code(415); echo json_encode(['success' => false, 'error' => 'Se requiere JSON']); exit;
    }
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'No se pudo conectar con MySQL. Revisa XAMPP y la configuración local.'
    ]);
    exit;
}
