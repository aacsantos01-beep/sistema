<?php

class TelegramService {
    private static $botToken = "8688992415:AAGe8ueTm3N3iZT9Ewvb4sCt_aWcrSFe3yY";
    private static $chatId = "6731705630";

    public static function sendMessage($message) {
        if (empty(self::$botToken)) return false;

        $url = "https://api.telegram.org/bot" . self::$botToken . "/sendMessage";
        $data = [
            'chat_id' => self::$chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ];

        $ch = curl_init($url);
        $payload = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $logMsg = date('Y-m-d H:i:s') . " - Status: $httpCode | Resposta: $result | Erro: $error" . PHP_EOL;
        file_put_contents(__DIR__ . '/../telegram_debug.log', $logMsg, FILE_APPEND);

        return $httpCode === 200;
    }

    public static function escapeHtml($text) {
        return htmlspecialchars($text ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
