<?php

class JWT {
    private static $key = "REDACTED_ROTATED_JWT_SECRET"; // Mesma chave do seu Node.js

    public static function generate($data) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode(array_merge($data, ['exp' => time() + (60 * 60 * 24)])); // 24h

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function validate($token) {
        $partes = explode('.', $token);
        if (count($partes) !== 3) return false;

        list($header, $payload, $signature) = $partes;
        $validSignature = hash_hmac('sha256', $header . "." . $payload, self::$key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

        if ($base64UrlSignature !== $signature) return false;

        $payloadData = json_decode(base64_decode($payload), true);
        if ($payloadData['exp'] < time()) return false;

        return $payloadData;
    }
}
