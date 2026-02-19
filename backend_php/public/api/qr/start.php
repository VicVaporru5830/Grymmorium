<?php
require_once __DIR__.'/../../../../src/session.php';
require_once __DIR__.'/../../../../src/response.php';
require_once __DIR__.'/../../../../src/cors.php';

cors();
start_session();

if (empty($_SESSION['uid'])) json(['error'=>'No autenticado'], 401);

$token = bin2hex(random_bytes(16));
$_SESSION['qr_token'] = $token;

json(['token'=>$token]);