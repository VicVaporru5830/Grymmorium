<?php
require_once __DIR__.'/../../../../src/session.php';
require_once __DIR__.'/../../../../src/response.php';
require_once __DIR__.'/../../../../src/cors.php';

cors();
start_session();

$body = json_decode(file_get_contents('php://input'), true);
$token = $body['token'] ?? '';

if ($token === ($_SESSION['qr_token'] ?? '')) {
    $_SESSION['qr_verified'] = true;
    json(['ok'=>true]);
}

json(['error'=>'Token inválido'], 400);