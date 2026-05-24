import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function check() {
    console.log('--- Verificando ID do Chat Correto ---');
    console.log('Token atual:', BOT_TOKEN);

    try {
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const updates = response.data.result;
        
        if (updates.length === 0) {
            console.log('\nNenhuma mensagem encontrada.');
            console.log('AÇÃO NECESSÁRIA: Envie uma mensagem (ex: "Oi") para o seu bot no Telegram AGORA.');
            return;
        }

        console.log(`\nEncontradas ${updates.length} atualizações recentes:\n`);
        
        updates.forEach((u: any) => {
            const message = u.message || u.my_chat_member;
            if (message && message.chat) {
                console.log(`- De: ${message.chat.first_name || 'N/A'} (ID: ${message.chat.id})`);
                if (message.text) console.log(`  Mensagem: "${message.text}"`);
            }
        });

        console.log('\nCopie o ID acima e cole no seu arquivo .env no campo TELEGRAM_CHAT_ID.');

    } catch (error: any) {
        console.error('Erro ao acessar API do Telegram:', error.message);
    }
}

check();
