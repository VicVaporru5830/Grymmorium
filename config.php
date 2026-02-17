<?php
return [
  'db' => [
    'dsn'  => 'mysql:host=127.0.0.1;dbname=proyecto;charset=utf8mb4',
    'user' => 'root',
    'pass' => '',
  ],
  'session' => [
    'name' => 'APPSESSID',
    'cookie_secure' => false,     // true en producción con HTTPS
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',   // o 'Strict' según tu caso
  ],
  'frontend_origin' => 'https://tu-usuario.github.io' // para CORS
];