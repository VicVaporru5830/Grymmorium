<?php
function cors() {
  $cfg = require __DIR__.'/../config/config.php';
  header("Access-Control-Allow-Origin: ".$cfg['frontend_origin']);
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Headers: Content-Type");
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
}