<?php
require_once __DIR__ . '/../utils/JWT.php';

function authenticate() {
    $headers = apache_request_headers();
    
    // Fallback para headers se o apache_request_headers não funcionar (comum em alguns servers)
    if (!isset($headers['Authorization'])) {
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) == "HTTP_") {
                $key = str_replace(" ", "-", ucwords(strtolower(str_replace("_", " ", substr($key, 5)))));
                $headers[$key] = $value;
            }
        }
    }

    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(["message" => "Nenhum token fornecido"]);
        exit();
    }

    $token = str_replace('Bearer ', '', $headers['Authorization']);
    $decoded = JWT::validate($token);

    if (!$decoded) {
        http_response_code(401);
        echo json_encode(["message" => "Token inválido ou expirado"]);
        exit();
    }

    return $decoded;
}

function isAdmin($user) {
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["message" => "Acesso negado: Somente administradores."]);
        exit();
    }
}
