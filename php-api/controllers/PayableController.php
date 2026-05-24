<?php
require_once __DIR__ . '/../middleware/auth.php';

class PayableController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("SELECT * FROM payables ORDER BY due_date ASC");
        echo json_encode($stmt->fetchAll());
    }

    public function create() {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $stmt = $this->pdo->prepare("INSERT INTO payables (description, amount, due_date, category, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['description'], 
            $data['amount'], 
            $data['due_date'], 
            $data['category'] ?? null, 
            $data['payment_method'] ?? null,
            $data['status'] ?? 'pending'
        ]);
        
        echo json_encode(["id" => $this->pdo->lastInsertId(), "message" => "Conta registrada"]);
    }

    public function update($id) {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $stmt = $this->pdo->prepare("UPDATE payables SET description = ?, amount = ?, due_date = ?, category = ?, payment_method = ?, status = ? WHERE id = ?");
        $stmt->execute([
            $data['description'], 
            $data['amount'], 
            $data['due_date'], 
            $data['category'], 
            $data['payment_method'], 
            $data['status'], 
            $id
        ]);
        
        echo json_encode(["message" => "Conta atualizada"]);
    }

    public function delete($id) {
        authenticate();
        $stmt = $this->pdo->prepare("DELETE FROM payables WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Conta removida"]);
    }
}
