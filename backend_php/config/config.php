<?php
return [
  'db' => [
    // Ajusta host/puerto/credenciales según tu entorno
    'dsn'  => 'mysql:host=127.0.0.1;dbname=jovan;charset=utf8mb4',
    'user' => 'root',
    'pass' => '',
  ],
  // Origen permitido para CORS (tu Pages o tu dominio front)
  'frontend_origin' => 'https://rodrimimi48-cmd.github.io/Jovanfinal', // <-- CAMBIA ESTO
];