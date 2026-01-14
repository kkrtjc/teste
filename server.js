const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

dotenv.config();

const app = express();

// Configuração de Segurança CORS (Simplificada para Testes e Produção)
app.use(cors({
    origin: '*', // Permite qualquer origem durante a fase de testes para evitar CORB
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
}));

// Rota de Diagnóstico (Health Check)
// Rota de Diagnóstico (Health Check) - Mudado para /health para não bloquear o index.html
app.get('/health', (req, res) => {
    res.send('<h1>Mura Engine V3 Online! 🚀</h1><p>Se você está vendo isso, o servidor no Render está funcionando.</p>');
});
app.use(bodyParser.json());

// Paths
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const HISTORY_PATH = path.join(__dirname, 'data', 'history.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, '[]');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Helpers
function getDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        return { products: {}, orderBumps: {} };
    }
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4)); }

function getHistory() {
    try {
        return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}
function saveHistory(data) { fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 4)); }

function logSale(customer, items) {
    try {
        const history = getHistory();
        const sale = {
            date: new Date().toISOString(),
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            items: items.map(i => i.title),
            total: items.reduce((acc, i) => acc + Number(i.price), 0)
        };
        history.push(sale);
        saveHistory(history);
        console.log(`✅ [HISTÓRICO] Venda salva para ${customer.email}. Total no log: ${history.length}`);
        return true;
    } catch (e) {
        console.error(`❌ [HISTÓRICO ERROR] Falha ao salvar venda:`, e.message);
        return false;
    }
}

// Mercado Pago
const client = new mercadopago.MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5'
});
const payment = new mercadopago.Payment(client);

// API Routes
app.get('/api/config', (req, res) => res.json(getDB()));

app.post('/api/config/update', (req, res) => {
    const { password, data } = req.body;
    if (password !== 'mura2026') return res.status(401).json({ error: 'Acesso Negado' });
    saveDB(data);
    res.json({ success: true });
});

app.get('/api/history', (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== 'mura2026') return res.status(401).json({ error: 'Acesso Negado' });
    res.json(getHistory());
});

app.get('/api/products/:id', (req, res) => {
    const db = getDB();
    const product = db.products[req.params.id];
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    const bumps = (product.orderBumps || []).map(id => db.orderBumps[id]).filter(k => k);
    res.json({ ...product, fullBumps: bumps });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Nodemailer Config (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'galosmurabrasill@gmail.com',
        pass: process.env.EMAIL_PASS // Usando a chave 'wcaisazhfjsoeglr' do Render
    }
});

// Email Sender Function
async function sendEmail(customer, items) {
    console.log(`📧 [EMAIL] Preparando envio para: ${customer.email}`);
    const downloadLink = 'https://teste-m1kq.onrender.com/downloads?items=' + items.map(i => i.id || i.title).join(',');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
            <div style="background-color: #000; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #FFD700; margin: 0;">Pagamento Aprovado!</h1>
            </div>
            
            <div style="background-color: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #333;">Olá, <strong>${customer.name}</strong>!</p>
                <p style="font-size: 16px; color: #333;">Seu pagamento foi confirmado com sucesso. Abaixo está o link para acessar seus materiais agora mesmo:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${downloadLink}" style="background-color: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 30px; font-size: 18px; display: inline-block;">BAIXAR AGORA ➔</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:</p>
                <p style="font-size: 12px; color: #888; word-break: break-all;">${downloadLink}</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                
                <h3 style="color: #333;">Resumo do Pedido:</h3>
                <ul style="color: #555;">
                    ${items.map(i => `<li>${i.title}</li>`).join('')}
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
                <p>© 2025 Protocolo Elite 360º. Todos os direitos reservados.</p>
            </div>
        </div>
    `;

    try {
        const mailOptions = {
            from: `"Protocolo Elite" <${process.env.EMAIL_USER || 'galosmurabrasill@gmail.com'}>`,
            to: customer.email,
            subject: '🐓 Acesso Liberado: Protocolo Elite 360º',
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [EMAIL SUCCESS] Enviado para ${customer.email}. ID: ${info.messageId}`);
    } catch (error) {
        console.error('❌ [EMAIL ERROR] Falha ao enviar via Gmail:', error.message);
    }
}

// ROTA DE TESTE DE EMAIL (Resend)
app.get('/test-email', async (req, res) => {
    try {
        console.log("🛠️ [TESTE] Iniciando teste de fluxo completo de email...");
        const customer = {
            name: 'Cliente Teste Mura',
            email: 'galosmurabrasill@gmail.com',
            phone: '38999832950'
        };
        const items = [
            { id: 'manejo', title: 'Manual de Manejo (Teste)', price: 10 },
            { id: 'doencas', title: 'Guia de Doenças (Teste)', price: 5 }
        ];

        await sendEmail(customer, items);

        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Teste Gmail SMTP Enviado! 🚀</h1>
                <p>O servidor tentou enviar um e-mail para <b>galosmurabrasill@gmail.com</b>.</p>
                <p>Verifique agora os <b>Registros (Logs) do Render</b> para confirmar o status.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send(`<h1>Erro no Teste! ❌</h1><p>${error.message}</p>`);
    }
});

// Ebook Download Routes
app.get('/download/:type', (req, res) => {
    const type = req.params.type;
    let filePath = '';
    let fileName = '';

    if (type === 'manejo') {
        filePath = path.join(__dirname, 'ebook_manejo.pdf');
        fileName = 'Manual_Manejo_Pintinhos.pdf';
    } else if (type === 'doencas') {
        filePath = path.join(__dirname, 'ebook_doencas.pdf');
        fileName = 'Guia_Doencas_Avicolas.pdf';
    } else if (type === 'orderbump' || type === 'bump') {
        filePath = path.join(__dirname, 'ebook_orderbump.pdf');
        fileName = 'Tabela_Racao_Completa.pdf';
    } else {
        filePath = path.join(__dirname, 'ebook.pdf');
        fileName = 'Ebook_O_Segredo_das_Galinhas.pdf';
    }

    // Debug logging
    console.log(`[DOWNLOAD] Request for type: ${type}`);
    console.log(`[DOWNLOAD] Target path: ${filePath}`);

    if (fs.existsSync(filePath)) {
        console.log(`[DOWNLOAD] File found! Sending: ${fileName}`);
        res.download(filePath, fileName);
    } else {
        console.error(`[DOWNLOAD] File NOT found at: ${filePath}`);

        // Retornar erro 404 direto se o arquivo específico não existir
        res.status(404).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Ops! Arquivo não encontrado.</h1>
                <p>Não foi possível localizar o arquivo: <strong>${fileName}</strong></p>
                <p>Nosso sistema registrou esse erro e já estamos verificando.</p>
                <p>Enquanto isso, clique abaixo para receber pelo WhatsApp:</p>
                <a href="https://wa.me/5538999832950?text=Ola,%20tive%20erro%20ao%20baixar%20o%20arquivo%20${encodeURIComponent(fileName)}" 
                   style="display: inline-block; background: #25d366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; margin-top: 20px;">
                   <i class="fa fa-whatsapp"></i> Receber no WhatsApp
                </a>
            </div>
        `);
    }
});

// Rota de Diagóstico (Remover em produção)
app.get('/debug-files', (req, res) => {
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const pdfs = files.filter(f => f.endsWith('.pdf'));
        res.json({
            currentDir: __dirname,
            allFiles: files,
            pdfs: pdfs
        });
    });
});

// Downloads Page Route - Serves custom download page with purchased items
app.get('/downloads', (req, res) => {
    res.sendFile(path.join(__dirname, 'downloads.html'));
});

app.post('/api/checkout/pix', async (req, res) => {
    const { items, customer, deliveryMethod } = req.body;
    const totalAmount = items.reduce((acc, item) => acc + Number(item.price), 0);
    const body = {
        transaction_amount: totalAmount,
        description: items.map(i => i.title).join(', '),
        payment_method_id: 'pix',
        payer: {
            email: customer.email,
            first_name: customer.name.split(' ')[0],
            last_name: customer.name.split(' ').slice(1).join(' ') || 'User',
            identification: { type: 'CPF', number: customer.cpf }
        },
        metadata: { delivery_method: deliveryMethod, customer_phone: customer.phone }
    };
    try {
        const response = await payment.create({ body });
        res.json({
            qr_code: response.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
            id: response.id,
            status: response.status
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no Pagamento', message: error.message });
    }
});

app.post('/api/checkout/card', async (req, res) => {
    try {
        const { items, customer, token, installments, issuer_id, payment_method_id } = req.body;
        const totalAmount = items.reduce((acc, item) => acc + Number(item.price), 0);
        const body = {
            transaction_amount: totalAmount,
            token: token,
            description: items.map(i => i.title).join(', '),
            installments: Number(installments),
            payment_method_id,
            issuer_id,
            payer: {
                email: customer.email,
                first_name: customer.name.split(' ')[0],
                last_name: customer.name.split(' ').slice(1).join(' ') || 'User',
                identification: { type: 'CPF', number: customer.cpf }
            },
            metadata: { delivery_method: 'email', customer_phone: customer.phone }
        };
        const response = await payment.create({ body });
        if (response.status === 'approved') {
            console.log(`✅ [CARTÃO] Pagamento Aprovado via Checkout Direto! ID: ${response.id}`);
            logSale(customer, items);
            sendEmail(customer, items); // Auto-email re-enabled
            res.json({ status: 'approved', id: response.id });
        } else {
            res.status(400).json({ status: response.status, status_detail: response.status_detail });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar pagamento', message: error.message });
    }
});

app.get('/api/payment/:id', async (req, res) => {
    try {
        const result = await payment.get({ id: req.params.id });
        res.json({ id: result.id, status: result.status, status_detail: result.status_detail });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar status' });
    }
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
    const topic = req.query.topic || req.query.type || req.body.topic || req.body.type;
    const paymentId = req.query.id || (req.body.data && req.body.data.id) || req.body.id;
    console.log(`📡 [WEBHOOK] Chamada recebida! Topic: ${topic}, ID: ${paymentId}`);

    if (topic === 'payment' || topic === 'payment.updated') {
        try {
            const paymentResult = await payment.get({ id: paymentId });
            console.log(`🔔 [WEBHOOK] Status do pagamento ${paymentId}: ${paymentResult.status}`);

            if (paymentResult.status === 'approved') {
                console.log(`✅ [WEBHOOK] Pagamento Aprovado! ID: ${paymentId}`);

                // Check metadata
                const metadata = paymentResult.metadata || {};
                console.log(`📋 [WEBHOOK] Métadados encontrados:`, JSON.stringify(metadata));

                // Reconstruct customer data - Use Payer as fallback if metadata is missing
                const customer = {
                    name: (paymentResult.payer && paymentResult.payer.first_name)
                        ? `${paymentResult.payer.first_name} ${paymentResult.payer.last_name || ''}`.trim()
                        : 'Cliente',
                    email: (paymentResult.payer && paymentResult.payer.email) || 'galosmurabrasill@gmail.com',
                    phone: metadata.customer_phone || (paymentResult.metadata && paymentResult.metadata.customer_phone) || 'Sem Telefone'
                };

                // Reconstruct items from description
                const itemTitles = (paymentResult.description || 'Produto').split(', ');
                const items = itemTitles.map(title => ({
                    title: title,
                    price: paymentResult.transaction_amount / itemTitles.length
                }));

                logSale(customer, items);

                console.log(`📤 [WEBHOOK] Enviando e-mail automático...`);
                sendEmail(customer, items);

                console.log(`📦 Venda registrada via Webhook: ${customer.name} - ${itemTitles.join(', ')}`);
            }
            res.sendStatus(200);
        } catch (error) {
            console.error('Webhook error:', error);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(200);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🚀 Mura Engine running on port ${PORT}`));