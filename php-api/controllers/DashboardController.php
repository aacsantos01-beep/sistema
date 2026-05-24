<?php
require_once __DIR__ . '/../middleware/auth.php';

class DashboardController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getStats() {
        authenticate();

        // Vendas Hoje
        $stmtSalesToday = $this->pdo->query("SELECT SUM(total_amount) as total FROM sales WHERE date(created_at) = date('now')");
        $salesToday = $stmtSalesToday->fetch()['total'] ?? 0;

        // Vendas Mês
        $stmtSalesMonth = $this->pdo->query("SELECT SUM(total_amount) as total FROM sales WHERE strftime('%m-%Y', created_at) = strftime('%m-%Y', 'now')");
        $salesMonth = $stmtSalesMonth->fetch()['total'] ?? 0;

        // Total de Produtos
        $stmtProducts = $this->pdo->query("SELECT COUNT(*) as total FROM products");
        $totalProducts = $stmtProducts->fetch()['total'] ?? 0;

        // Contas a Pagar (Pendentes)
        $stmtPayables = $this->pdo->query("SELECT SUM(amount) as total FROM payables WHERE status = 'pending'");
        $payablesPending = $stmtPayables->fetch()['total'] ?? 0;

        // Gráfico de vendas (últimos 7 dias)
        $stmtChart = $this->pdo->query("
            SELECT date(created_at) as date, SUM(total_amount) as amount 
            FROM sales 
            GROUP BY date(created_at) 
            ORDER BY date(created_at) DESC 
            LIMIT 7
        ");
        $chartData = array_reverse($stmtChart->fetchAll());

        echo json_encode([
            "salesToday" => (float)$salesToday,
            "salesMonth" => (float)$salesMonth,
            "totalProducts" => (int)$totalProducts,
            "payablesPending" => (float)$payablesPending,
            "chartData" => $chartData
        ]);
    }
}
