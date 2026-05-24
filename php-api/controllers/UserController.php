<?php
require_once __DIR__ . '/../middleware/auth.php';

class UserController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("SELECT id, username, role, image_url FROM users ORDER BY username ASC");
        echo json_encode($stmt->fetchAll());
    }

    public function create() {
        authenticate(); // Protege a rota (apenas admins deveriam criar, você pode adicionar isAdmin(authenticate()) se quiser)
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;
        $role = $data['role'] ?? 'vendedor';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(["message" => "Usuário e senha são obrigatórios"]);
            return;
        }

        try {
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $this->pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashedPassword, $role]);
            
            http_response_code(201);
            echo json_encode([
                "id" => $this->pdo->lastInsertId(), 
                "username" => $username, 
                "role" => $role,
                "message" => "Usuário criado com sucesso"
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == '23000') {
                http_response_code(400);
                echo json_encode(["message" => "Este nome de usuário já existe"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Erro ao criar usuário: " . $e->getMessage()]);
            }
        }
    }

    public function update($id) {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $username = $data['username'] ?? null;
        $role = $data['role'] ?? 'vendedor';
        $password = $data['password'] ?? null;

        try {
            if ($password) {
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $this->pdo->prepare("UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?");
                $stmt->execute([$username, $role, $hashedPassword, $id]);
            } else {
                $stmt = $this->pdo->prepare("UPDATE users SET username = ?, role = ? WHERE id = ?");
                $stmt->execute([$username, $role, $id]);
            }
            echo json_encode(["message" => "Usuário atualizado com sucesso"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao atualizar usuário"]);
        }
    }

    public function delete($id) {
        authenticate();
        try {
            // Evitar que o usuário delete a si mesmo ou o admin principal (opcional)
            $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Usuário removido com sucesso"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao remover usuário"]);
        }
    }
}
