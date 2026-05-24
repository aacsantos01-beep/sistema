"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramNotification = exports.checkBotUpdates = exports.escapeHtml = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
exports.escapeHtml = escapeHtml;
const checkBotUpdates = async () => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN)
        return;
    try {
        const response = await axios_1.default.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const updates = response.data.result;
        if (updates.length > 0) {
            console.log('--- ÚLTIMAS ATUALIZAÇÕES DO BOT ---');
            updates.forEach((u) => {
                const chat = u.message?.chat || u.my_chat_member?.chat;
                if (chat) {
                    console.log(`Mensagem de: ${chat.first_name || 'N/A'} - ID do Chat: ${chat.id}`);
                }
            });
            console.log('-----------------------------------');
        }
        else {
            console.log('Nenhuma mensagem recente encontrada. Envie um "oi" para o bot!');
        }
    }
    catch (error) {
        console.error('Erro ao buscar atualizações do Telegram');
    }
};
exports.checkBotUpdates = checkBotUpdates;
const sendTelegramNotification = async (message) => {
    // ...
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID || BOT_TOKEN === 'seu_token_aqui') {
        console.warn('Telegram Bot não configurado ou token padrão detectado. Notificação ignorada.');
        return;
    }
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        console.log('Tentando enviar notificação ao Telegram...');
        const response = await axios_1.default.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        if (response.status === 200) {
            console.log('Notificação enviada ao Telegram com sucesso.');
        }
        else {
            console.warn('Telegram retornou status inesperado:', response.status);
        }
    }
    catch (error) {
        console.error('Erro detalhado ao enviar notificação ao Telegram:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
        else {
            console.error('Mensagem:', error.message);
        }
    }
};
exports.sendTelegramNotification = sendTelegramNotification;
