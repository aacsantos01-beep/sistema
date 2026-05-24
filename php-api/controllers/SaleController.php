<?php
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/TelegramService.php';

class SaleController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC
        ");
        echo json_encode($stmt->fetchAll());
    }

    public function create() {
        $user = authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $items = $data['items'] ?? [];
        $total_amount = $data['total_amount'] ?? 0;
        $seller_id = $data['seller_id'] ?? null;
        $payment_method = $data['payment_method'] ?? null;
        $user_id = $user['id'];

        try {
            $this->pdo->beginTransaction();

            // Criar a venda
            $stmt = $this->pdo->prepare("INSERT INTO sales (total_amount, user_id, seller_id, payment_method) VALUES (?, ?, ?, ?)");
            $stmt->execute([$total_amount, $user_id, $seller_id, $payment_method]);
            $saleId = $this->pdo->lastInsertId();

            $itemsProcessed = [];

            foreach ($items as $item) {
                $productId = $item['productId'] ?? null;
                $serviceName = $item['service_name'] ?? null;
                $quantity = $item['quantity'];
                $price = $item['price'];

                if ($productId) {
                    // Verificar estoque
                    $stmtProd = $this->pdo->prepare("SELECT name, stock FROM products WHERE id = ?");
                    $stmtProd->execute([$productId]);
                    $product = $stmtProd->fetch();

                    if (!$product || $product['stock'] < $quantity) {
                        throw new Exception("Estoque insuficiente para " . ($product['name'] ?? 'Produto ID: ' . $productId));
                    }

                    // Registrar item
                    $stmtItem = $this->pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)");
                    $stmtItem->execute([$saleId, $productId, $quantity, $price]);

                    // Baixar estoque
                    $stmtStock = $this->pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
                    $stmtStock->execute([$quantity, $productId]);

                    $itemsProcessed[] = ["name" => $product['name'], "quantity" => $quantity, "price" => $price];
                } else if ($serviceName) {
                    $stmtItem = $this->pdo->prepare("INSERT INTO sale_items (sale_id, service_name, quantity, price_at_sale) VALUES (?, ?, ?, ?)");
                    $stmtItem->execute([$saleId, $serviceName, $quantity, $price]);

                    $itemsProcessed[] = ["name" => $serviceName, "quantity" => $quantity, "price" => $price];
                }
            }

            $this->pdo->commit();

            // Notificação Telegram
            $this->notifyTelegram($saleId, $seller_id, $payment_method, $total_amount, $itemsProcessed);

            echo json_encode(["id" => $saleId, "message" => "Venda realizada com sucesso!"]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(400);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function getMonthlyReport($month, $year) {
        authenticate();
        $stmt = $this->pdo->prepare("
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE strftime('%m', s.created_at) = ? AND strftime('%Y', s.created_at) = ?
            ORDER BY s.id DESC
        ");
        $stmt->execute([str_pad($month, 2, '0', STR_PAD_LEFT), $year]);
        $sales = $stmt->fetchAll();

        // Calcular totais
        $totalAmount = 0;
        foreach ($sales as $sale) {
            $totalAmount += $sale['total_amount'];
        }

        echo json_encode([
            "sales" => $sales,
            "total_amount" => $totalAmount,
            "period" => "$month/$year"
        ]);
    }

    private function notifyTelegram($saleId, $seller_id, $payment_method, $total_amount, $items) {
        $stmtSeller = $this->pdo->prepare("SELECT name FROM sellers WHERE id = ?");
        $stmtSeller->execute([$seller_id]);
        $seller = $stmtSeller->fetch();

        $msg = "<b>🛒 NOVA VENDA REALIZADA! (#$saleId)</b>\n\n";
        $msg .= "👤 <b>Vendedor:</b> " . TelegramService::escapeHtml($seller['name'] ?? 'N/A') . "\n";
        $msg .= "💳 <b>Pagamento:</b> " . TelegramService::escapeHtml($payment_method) . "\n\n";
        $msg .= "📦 <b>Itens:</b>\n";

        foreach ($items as $item) {
            $msg .= "• {$item['quantity']}x " . TelegramService::escapeHtml($item['name']) . " - R$ " . number_format($item['price'] * $item['quantity'], 2, ',', '.') . "\n";
        }

        $msg .= "\n💰 <b>TOTAL: R$ " . number_format($total_amount, 2, ',', '.') . "</b>\n";
        $msg .= "\n<i>Agradecimento IR Assistência Técnica!</i>";

        TelegramService::sendMessage($msg);
    }
}
