<?php
function start_session(): void {
  if (session_status() === PHP_SESSION_NONE) {
    // Si despliegas en producción con HTTPS, añade cookie_secure => true y SameSite=Lax/Strict
    session_start();
  }
}