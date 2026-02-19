<?php
require_once __DIR__.'/../../../src/session.php';
require_once __DIR__.'/../../../src/response.php';
require_once __DIR__.'/../../../src/cors.php';

cors();
start_session();

if (!empty($_SESSION['uid']) && !empty($_SESSION['qr_verified'])) {
  json(['authenticated'=>true]);
}

json(['authenticated'=>false]);