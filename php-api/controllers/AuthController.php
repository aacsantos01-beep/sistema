<?php
require_once __DIR__ . '/../utils/JWT.php';

class AuthController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function login() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->username) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Usuário e senha são obrigatórios"]);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$data->username]);
        $user = $stmt->fetch();

        if ($user && password_verify($data->password, $user['password'])) {
            $token = JWT::generate([
                "id" => $user['id'],
                "username" => $user['username'],
                "role" => $user['role']
            ]);

            echo json_encode([
                "token" => $token,
                "user" => [
                    "id" => $user['id'],
                    "username" => $user['username'],
                    "role" => $user['role'],
                    "image_url" => $user['image_url']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Usuário ou senha inválidos"]);
        }
    }
}
