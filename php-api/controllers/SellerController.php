<?php
require_once __DIR__ . '/../middleware/auth.php';

class SellerController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("SELECT * FROM sellers ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }

    public function create() {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $name = $data['name'] ?? null;
        $email = $data['email'] ?? null;
        $phone = $data['phone'] ?? null;

        $stmt = $this->pdo->prepare("INSERT INTO sellers (name, email, phone) VALUES (?, ?, ?)");
        $stmt->execute([$name, $email, $phone]);
        
        echo json_encode(["id" => $this->pdo->lastInsertId(), "message" => "Vendedor criado"]);
    }

    public function update($id) {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $stmt = $this->pdo->prepare("UPDATE sellers SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['email'], $data['phone'], $data['active'] ?? 1, $id]);
        
        echo json_encode(["message" => "Vendedor atualizado"]);
    }

    public function delete($id) {
        authenticate();
        $stmt = $this->pdo->prepare("DELETE FROM sellers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Vendedor removido"]);
    }
}
