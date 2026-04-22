const mercadopago = require('mercadopago');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// 1. Configuração do Cliente
const client = new mercadopago.MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-8523040676915858-010416-38801bbcf39a1cf4c2d6e3680e247ab7-3111470347'
});
const payment = new mercadopago.Payment(client);

// 2. Caminhos
const HISTORY_PATH = path.join(__dirname, 'data', 'history.json');

async function recover() {
    console.log('🔍 Iniciando busca de pagamentos aprovados no Mercado Pago...');

    try {
        // Buscamos os últimos 50 pagamentos (ajuste conforme necessário)
        // Calcular datas para os últimos 30 dias
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const filters = {
            status: 'approved',
            sort: 'date_created',
            criteria: 'desc',
            range: 'date_created',
            begin_date: thirtyDaysAgo.toISOString(),
            end_date: now.toISOString()
        };

        const result = await payment.search({ options: filters });
        const payments = result.results || [];

        console.log(`✅ Encontrados ${payments.length} pagamentos aprovados.`);

        // Carregar histórico atual para evitar duplicatas
        let existingHistory = [];
        if (fs.existsSync(HISTORY_PATH)) {
            try {
                existingHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
            } catch (e) { existingHistory = []; }
        }

        const recoveredSales = [];

        payments.forEach(p => {
            const paymentId = String(p.id);

            // Pular se já existe no histórico
            if (existingHistory.some(h => String(h.paymentId) === paymentId)) {
                return;
            }

            const metadata = p.metadata || {};

            // Reconstruir o objeto de venda
            const sale = {
                date: p.date_approved || p.date_created,
                paymentId: paymentId,
                name: metadata.customer_name || (p.payer ? `${p.payer.first_name || ''} ${p.payer.last_name || ''}`.trim() : 'Cliente Recuperado'),
                email: metadata.customer_email || (p.payer ? p.payer.email : 'N/A'),
                phone: metadata.customer_phone || 'Recuperado',
                method: p.payment_method_id === 'pix' ? 'pix' : 'cartão',
                items: (p.description || 'Produto').split(', '),
                total: Number(p.transaction_amount)
            };

            recoveredSales.push(sale);
            console.log(`➡️ Recuperado: ${sale.name} (${sale.email}) - R$ ${sale.total}`);
        });

        if (recoveredSales.length > 0) {
            const finalHistory = [...existingHistory, ...recoveredSales];
            // Ordenar por data (mais recente primeiro)
            finalHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

            fs.writeFileSync(HISTORY_PATH, JSON.stringify(finalHistory, null, 4));
            console.log(`\n🎉 SUCESSO! ${recoveredSales.length} novas vendas foram restauradas em ${HISTORY_PATH}`);
        } else {
            console.log('\nℹ️ Nenhuma venda nova para recuperar ou todas já estão no log.');
        }

    } catch (error) {
        console.error('❌ Erro na recuperação:', error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    }
}

recover();
