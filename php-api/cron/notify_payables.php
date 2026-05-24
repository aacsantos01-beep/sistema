<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/TelegramService.php';

/**
 * Script para ser executado via Cron Job na Hostinger
 * Recomendado: 1x por dia (ex: às 08:00 da manhã)
 */

try {
    // Busca contas que vencem hoje e estão pendentes
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT * FROM payables WHERE due_date = ? AND status = 'pending'");
    $stmt->execute([$today]);
    $payables = $stmt->fetchAll();

    if (count($payables) > 0) {
        $msg = "<b>⚠️ ALERTA DE VENCIMENTO HOJE! (" . date('d/m/Y') . ")</b>\n\n";
        $totalDay = 0;

        foreach ($payables as $p) {
            $msg .= "💸 <b>Conta:</b> " . TelegramService::escapeHtml($p['description']) . "\n";
            $msg .= "💰 <b>Valor:</b> R$ " . number_format($p['amount'], 2, ',', '.') . "\n";
            $msg .= "📁 <b>Categoria:</b> " . TelegramService::escapeHtml($p['category'] ?? 'N/A') . "\n";
            $msg .= "----------------------------\n";
            $totalDay += $p['amount'];
        }

        $msg .= "\n📉 <b>Total para pagar hoje: R$ " . number_format($totalDay, 2, ',', '.') . "</b>\n";
        $msg .= "\n<i>Não esqueça de baixar no sistema após o pagamento!</i>";

        TelegramService::sendMessage($msg);
        echo "Notificações enviadas: " . count($payables);
    } else {
        echo "Nenhuma conta vencendo hoje.";
    }

} catch (Exception $e) {
    echo "Erro no cron: " . $e->getMessage();
}
