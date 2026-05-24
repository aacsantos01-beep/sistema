<?php
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/TelegramService.php';

class BudgetController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b 
            LEFT JOIN users u ON b.user_id = u.id 
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            ORDER BY b.id DESC
        ");
        echo json_encode($stmt->fetchAll());
    }

    public function create() {
        $user = authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        try {
            $this->pdo->beginTransaction();
            
            $stmt = $this->pdo->prepare("INSERT INTO budgets (customer_name, total_amount, user_id, seller_id, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['customer_name'] ?? null,
                $data['total_amount'],
                $user['id'],
                $data['seller_id'] ?? null,
                $data['status'] ?? 'pending'
            ]);
            $budgetId = $this->pdo->lastInsertId();

            foreach ($data['items'] as $item) {
                $stmtItem = $this->pdo->prepare("INSERT INTO budget_items (budget_id, product_id, item_name, quantity, price, is_service, has_warranty, warranty_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmtItem->execute([
                    $budgetId,
                    $item['product_id'] ?? null,
                    $item['item_name'],
                    $item['quantity'],
                    $item['price'],
                    $item['is_service'] ?? 0,
                    $item['has_warranty'] ?? 0,
                    $item['warranty_time'] ?? null
                ]);
            }

            $this->pdo->commit();
            
            // Notificação Telegram
            $this->notifyTelegramBudget($budgetId, $data['customer_name'] ?? 'N/A', $data['total_amount'], $data['items']);
            
            echo json_encode(["id" => $budgetId, "message" => "Orçamento criado"]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(400);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    private function notifyTelegramBudget($id, $customer, $total, $items) {
        require_once __DIR__ . '/../utils/TelegramService.php';
        
        $msg = "<b>📝 NOVO ORÇAMENTO GERADO! (#$id)</b>\n\n";
        $msg .= "👤 <b>Cliente:</b> " . TelegramService::escapeHtml($customer) . "\n";
        $msg .= "💰 <b>Valor Total: R$ " . number_format($total, 2, ',', '.') . "</b>\n\n";
        $msg .= "📋 <b>Itens/Serviços:</b>\n";

        foreach ($items as $item) {
            $msg .= "• " . TelegramService::escapeHtml($item['item_name']) . " (R$ " . number_format($item['price'], 2, ',', '.') . ")\n";
        }

        $msg .= "\n<i>Aguardando aprovação do cliente.</i>";
        TelegramService::sendMessage($msg);
    }

    public function updateStatus($id) {
        authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        $newStatus = $data['status'] ?? 'pending';

        try {
            // Buscar dados atuais para a notificação
            $stmt = $this->pdo->prepare("SELECT customer_name, total_amount FROM budgets WHERE id = ?");
            $stmt->execute([$id]);
            $budget = $stmt->fetch();

            if (!$budget) {
                http_response_code(404);
                echo json_encode(["message" => "Orçamento não encontrado"]);
                return;
            }

            $stmtUpdate = $this->pdo->prepare("UPDATE budgets SET status = ? WHERE id = ?");
            $stmtUpdate->execute([$newStatus, $id]);

            // Notificar mudança de status
            $statusLabels = [
                'pending' => '⏳ Pendente',
                'approved' => '✅ Aprovado',
                'cancelled' => '❌ Cancelado',
                'converted' => '🛒 Convertido em Venda'
            ];
            $statusLabel = $statusLabels[$newStatus] ?? $newStatus;

            $msg = "<b>🔄 STATUS ALTERADO! (Orçamento #$id)</b>\n\n";
            $msg .= "👤 <b>Cliente:</b> " . TelegramService::escapeHtml($budget['customer_name'] ?? 'N/A') . "\n";
            $msg .= "💰 <b>Valor:</b> R$ " . number_format($budget['total_amount'], 2, ',', '.') . "\n";
            $msg .= "📍 <b>Novo Status:</b> " . $statusLabel . "\n";

            TelegramService::sendMessage($msg);

            echo json_encode(["message" => "Status atualizado com sucesso"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao atualizar status"]);
        }
    }

    public function getDetails($id) {
        authenticate();
        $stmt = $this->pdo->prepare("SELECT b.*, u.username, sl.name as seller_name FROM budgets b LEFT JOIN users u ON b.user_id = u.id LEFT JOIN sellers sl ON b.seller_id = sl.id WHERE b.id = ?");
        $stmt->execute([$id]);
        $budget = $stmt->fetch();

        if (!$budget) {
            http_response_code(404);
            echo json_encode(["message" => "Orçamento não encontrado"]);
            return;
        }

        $stmtItems = $this->pdo->prepare("SELECT * FROM budget_items WHERE budget_id = ?");
        $stmtItems->execute([$id]);
        $budget['items'] = $stmtItems->fetchAll();

        echo json_encode($budget);
    }
}
