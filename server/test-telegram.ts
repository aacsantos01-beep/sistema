import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function test() {
    console.log('Token:', BOT_TOKEN);
    console.log('Chat ID:', CHAT_ID);

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('ERRO: Variáveis de ambiente não encontradas!');
        return;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await axios.post(url, {
            chat_id: CHAT_ID,
            text: '🚀 Teste manual do sistema IR Assistência Técnica',
            parse_mode: 'HTML'
        });
        console.log('Sucesso!', response.data);
    } catch (error: any) {
        console.error('Erro no teste:');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

test();
