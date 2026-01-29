const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');


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

// Paths - PERSISTENCE LOGIC (Render Starter)
const MOUNTED_DISK_PATH = '/data'; // Based on our Render Disk setup
const DATA_DIR = fs.existsSync(MOUNTED_DISK_PATH) ? MOUNTED_DISK_PATH : path.join(__dirname, 'data');

const DB_PATH = path.join(DATA_DIR, 'db.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const ANALYTICS_PATH = path.join(DATA_DIR, 'analytics.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads'); // Move uploads to disk too!

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial Data Migration (Move local files to persistent disk if disk is empty)
const LOCAL_DB = path.join(__dirname, 'data', 'db.json');
const LOCAL_HISTORY = path.join(__dirname, 'data', 'history.json');

if (DATA_DIR === MOUNTED_DISK_PATH) {
    if (!fs.existsSync(DB_PATH) && fs.existsSync(LOCAL_DB)) {
        fs.copyFileSync(LOCAL_DB, DB_PATH);
        console.log('📦 [MIGRAÇÃO] Banco de dados movido para o DISCO PERSISTENTE.');
    }
    if (!fs.existsSync(HISTORY_PATH) && fs.existsSync(LOCAL_HISTORY)) {
        fs.copyFileSync(LOCAL_HISTORY, HISTORY_PATH);
        console.log('📦 [MIGRAÇÃO] Histórico movido para o DISCO PERSISTENTE.');
    }
}

if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, '[]');
if (!fs.existsSync(ANALYTICS_PATH)) fs.writeFileSync(ANALYTICS_PATH, JSON.stringify({
    totals: {
        clicks: 0, checkoutOpens: 0, checkoutStarts: 0,
        uiErrors: 0, trustClicks: 0, mobileSessions: 0,
        desktopSessions: 0, slowLoads: 0, pageViews: 0
    },
    daily: {}
}, null, 4));

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Helpers
// In-memory cache for DB
let cacheDB = null;

function getDB() {
    if (cacheDB) return cacheDB;
    try {
        cacheDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        return cacheDB;
    } catch (e) {
        return { products: {}, orderBumps: {} };
    }
}
function saveDB(data) {
    cacheDB = data;
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
}

function getHistory() {
    try {
        return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}
function saveHistory(data) { fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 4)); }

function getAnalytics() {
    try {
        let analytics = {
            totals: {
                clicks: 0, checkoutOpens: 0, checkoutStarts: 0,
                uiErrors: 0, trustClicks: 0, mobileSessions: 0,
                desktopSessions: 0, slowLoads: 0, pageViews: 0
            },
            daily: {}
        };

        if (fs.existsSync(ANALYTICS_PATH)) {
            const fileData = JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf8'));

            // Migration for old flat structure
            if (!fileData.totals && fileData.pageViews !== undefined) {
                analytics.totals = { ...analytics.totals, ...fileData };
            } else {
                analytics = { ...analytics, ...fileData };
            }
        }

        const history = getHistory();
        const approvedSales = history.filter(h => h && h.total > 0);
        const totalRevenue = approvedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

        return {
            ...analytics,
            totalRevenue: totalRevenue,
            approvedCount: approvedSales.length,
            historyCount: history.length
        };
    } catch (e) {
        console.error("❌ [ANALYTICS ERROR]", e.message);
        return {
            totals: {
                clicks: 0, checkoutOpens: 0, checkoutStarts: 0,
                uiErrors: 0, trustClicks: 0, mobileSessions: 0,
                desktopSessions: 0, slowLoads: 0, pageViews: 0
            },
            daily: {},
            totalRevenue: 0, approvedCount: 0, historyCount: 0
        };
    }
}

function saveAnalytics(data) {
    try {
        const toSave = {
            totals: data.totals,
            daily: data.daily
        };
        fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(toSave, null, 4));
    } catch (e) {
        console.error("❌ [SAVE ANALYTICS ERROR]", e.message);
    }
}

async function logSale(customer, items, paymentId, method = 'cartão') {
    try {
        // SYNCHRONOUS LOCK (Blocking) - Prevents Race Conditions/Data Loss
        // For this scale, blocking for 2ms is better than losing a sale record.
        let history = [];
        try {
            if (fs.existsSync(HISTORY_PATH)) {
                const data = fs.readFileSync(HISTORY_PATH, 'utf8');
                history = JSON.parse(data);
            }
        } catch (e) { history = []; }

        // Prevent duplicate logs
        if (paymentId && history.some(h => h.paymentId === paymentId)) {
            console.log(`ℹ️ [HISTÓRICO] Venda já registrada para o ID: ${paymentId}`);
            return true;
        }

        const sale = {
            date: new Date().toISOString(),
            paymentId: paymentId || `manual-${Date.now()}`,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            method: method,
            items: items.map(i => i.title),
            total: items.reduce((acc, i) => acc + Number(i.price), 0)
        };
        history.push(sale);

        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 4));
        console.log(`✅ [HISTÓRICO] Venda salva [${method}] para ${customer.email}.`);
        return true;
    } catch (e) {
        console.error(`❌ [HISTÓRICO ERROR] Falha ao salvar venda:`, e.message);
        return false;
    }
}


// Mercado Pago - MODO PRODUÇÃO
const client = new mercadopago.MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-8523040676915858-010416-38801bbcf39a1cf4c2d6e3680e247ab7-3111470347'
});
const payment = new mercadopago.Payment(client);

// API Routes
app.get('/api/config', (req, res) => res.json(getDB()));

app.post('/api/config/update', (req, res) => {
    const { password, data } = req.body;
    // CRITICAL: Ensure 'mura2026' is set as an environment variable in production
    if (password !== (process.env.ADMIN_PASSWORD || 'mura2026')) return res.status(401).json({ error: 'Acesso Negado' });
    saveDB(data);
    res.json({ success: true });
});

app.get('/api/history', (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== 'mura2026') return res.status(401).json({ error: 'Acesso Negado' });
    res.set('Cache-Control', 'no-store');
    res.json(getHistory());
});

app.get('/api/analytics', (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== 'mura2026') return res.status(401).json({ error: 'Acesso Negado' });
    res.set('Cache-Control', 'no-store');
    res.json(getAnalytics());
});

app.post('/api/history/clear', (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== (process.env.ADMIN_PASSWORD || 'mura2026')) return res.status(401).json({ error: 'Acesso Negado' });

    try {
        console.log(`🧹 [ADMIN] Iniciando limpeza de dados...`);
        fs.writeFileSync(HISTORY_PATH, '[]');
        fs.writeFileSync(ANALYTICS_PATH, JSON.stringify({
            clicks: 0,
            checkoutOpens: 0,
            checkoutStarts: 0,
            uiErrors: 0,
            trustClicks: 0,
            mobileSessions: 0,
            desktopSessions: 0,
            slowLoads: 0,
            pageViews: 0
        }, null, 4));

        console.log(`✅ [ADMIN] HISTORY_PATH: ${HISTORY_PATH} resetado.`);
        console.log(`✅ [ADMIN] ANALYTICS_PATH: ${ANALYTICS_PATH} resetado.`);

        res.json({ success: true });
    } catch (e) {
        console.error("❌ [ADMIN ERROR] Falha ao limpar arquivos:", e.message);
        res.status(500).json({ error: 'Erro ao limpar dados no servidor', details: e.message });
    }
});

app.post('/api/track', (req, res) => {
    const { type, isMobile, ctaId } = req.body;
    console.log(`📈 [TRACK] Evento: ${type}, Mobile: ${isMobile}, CTA: ${ctaId}`);
    const analytics = getAnalytics();
    const today = new Date().toISOString().split('T')[0];

    // Ensure today's bucket exists
    if (!analytics.daily[today]) {
        analytics.daily[today] = {
            clicks: 0, checkoutOpens: 0, checkoutStarts: 0,
            uiErrors: 0, trustClicks: 0, mobileSessions: 0,
            desktopSessions: 0, slowLoads: 0, pageViews: 0,
            ctaClicks: {}
        };
    }

    const t = analytics.totals;
    const d = analytics.daily[today];

    const increment = (key) => {
        if (t[key] !== undefined) t[key]++;
        if (d[key] !== undefined) d[key]++;
    };

    if (type === 'click') increment('clicks');
    else if (type === 'checkout_start') increment('checkoutStarts');
    else if (type === 'checkout_open') increment('checkoutOpens');
    else if (type === 'ui_error') increment('uiErrors');
    else if (type === 'trust_click') increment('trustClicks');
    else if (type === 'slow_load') increment('slowLoads');
    else if (type === 'session_start') {
        increment('pageViews');
        if (isMobile) increment('mobileSessions');
        else increment('desktopSessions');
    } else if (type === 'cta_click' && ctaId) {
        d.ctaClicks[ctaId] = (d.ctaClicks[ctaId] || 0) + 1;
        // Optionally increment click total too if not already tracked
        increment('clicks');
    }

    saveAnalytics(analytics);
    res.json({ success: true });
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
        pass: process.env.EMAIL_PASS || 'wcaisazhfjsoeglr' // Fallback to the known App Password
    }
});

// Email Sender Function
// Email Sender Function
async function sendEmail(customer, items) {
    console.log(`📧 [EMAIL] Preparando envio via GMAIL para: ${customer.email}`);
    const downloadLink = 'https://osegredodasgalinhas.pages.dev/downloads.html?items=' + items.map(i => i.id || i.title).join(',');

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
                <ul style="list-style: none; padding: 0;">
                    ${items.map(item => `
                        <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                            <span>${item.title}</span>
                            <strong>R$ ${Number(item.price).toFixed(2).replace('.', ',')}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: '"Galos Mura Brasil" <galosmurabrasill@gmail.com>',
            to: customer.email,
            subject: '✅ Seu Acesso Chegou! - O Segredo das Galinhas',
            html: htmlContent
        });

        console.log(`✅ [EMAIL] Enviado com sucesso! ID: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('❌ [EMAIL ERROR] Falha no envio Gmail:', err.message);
        return false;
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

// Downloads Page Route - Serves custom download page with purchased items
app.get('/downloads', (req, res) => {
    res.sendFile(path.join(__dirname, 'downloads.html'));
});

app.post('/api/checkout/pix', async (req, res) => {
    const { items, customer, deliveryMethod } = req.body;
    console.log(`🆕 [PIX] Nova solicitação: ${customer.email}`);
    console.log(`📦 Itens:`, JSON.stringify(items));

    const totalAmount = Number(items.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2));
    console.log(`💰 Total Calculado: ${totalAmount}`);

    if (totalAmount <= 0) {
        console.error(`❌ [PIX ERROR] Valor inválido calculado: ${totalAmount}`);
        return res.status(400).json({ error: 'Erro no valor do pedido', message: 'O valor total deve ser maior que zero.' });
    }

    // CRITICAL: Ensure CPF is clean (only numbers, no formatting)
    const cleanCPF = (customer.cpf || '').replace(/\D/g, '');

    if (cleanCPF.length !== 11) {
        console.error(`❌ [PIX ERROR] CPF inválido: ${customer.cpf} (limpo: ${cleanCPF})`);
        return res.status(400).json({
            error: 'CPF inválido',
            message: 'O CPF deve conter exatamente 11 dígitos.'
        });
    }

    const body = {
        transaction_amount: totalAmount,
        description: items.map(i => i.title).join(', '),
        payment_method_id: 'pix',
        external_reference: `ORDER-${Date.now()}`,
        notification_url: `${process.env.BASE_URL || 'https://teste-m1kq.onrender.com'}/api/webhooks/mercadopago`,
        statement_descriptor: 'GALOS MURA BRASIL',
        payer: {
            email: customer.email,
            first_name: customer.name.split(' ')[0],
            last_name: customer.name.split(' ').slice(1).join(' ') || 'User',
            identification: { type: 'CPF', number: cleanCPF }
        },
        additional_info: {
            items: items.map((item, idx) => ({
                id: item.id || `item-${idx}`,
                title: item.title,
                description: item.description || item.title,
                category_id: 'digital_goods',
                quantity: 1,
                unit_price: Number(item.price)
            }))
        },
        metadata: {
            delivery_method: deliveryMethod,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone
        }
    };

    try {
        console.time(`⏱️ [MP_PIX] ${customer.email}`);
        const response = await payment.create({ body });
        console.timeEnd(`⏱️ [MP_PIX] ${customer.email}`);

        // DEEP DEBUG LOGGING
        console.log(`✅ [PIX SUCCESS] Response for ${customer.email}:`, JSON.stringify({
            id: response.id,
            status: response.status,
            has_qr: !!(response.point_of_interaction && response.point_of_interaction.transaction_data && response.point_of_interaction.transaction_data.qr_code)
        }));

        res.json({
            qr_code: response.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
            id: response.id,
            status: response.status
        });
    } catch (error) {
        console.timeEnd(`⏱️ [MP_PIX] ${customer.email}`);
        console.error(`❌ [PIX ERROR] Falha ao gerar PIX:`, error.message);

        // Deep debug logging
        if (error.response) {
            console.error('⚠️ [DEBUG MP PIX] Response Data:', JSON.stringify(error.response.data || {}, null, 2));
            console.error('⚠️ [DEBUG MP PIX] Status:', error.response.status);
        } else if (error.cause) {
            console.error('⚠️ [DEBUG MP PIX] Cause:', JSON.stringify(error.cause, null, 2));
        }

        res.status(500).json({
            error: 'Erro ao gerar PIX',
            message: error.message,
            details: error.response ? error.response.data : (error.cause || 'Sem detalhes')
        });
    }
});

app.post('/api/checkout/card', async (req, res) => {
    try {
        const { items, customer, token, installments, issuer_id, payment_method_id } = req.body;
        console.log(`💳 [CARTÃO] Iniciando Processamento: ${customer.email}`);
        console.log(`📦 Itens:`, JSON.stringify(items));
        console.log(`🔢 Parcelas: ${installments}, Method: ${payment_method_id}`);

        const totalAmount = items.reduce((acc, item) => acc + Number(item.price), 0);
        console.log(`💰 Total Calculado: ${totalAmount}`);

        if (totalAmount <= 0) {
            console.error(`❌ [CARTÃO ERROR] Valor inválido calculado: ${totalAmount}`);
            return res.status(400).json({ error: 'Erro no valor do pedido', message: 'O valor total deve ser maior que zero.' });
        }

        // CRITICAL: Ensure CPF is clean (only numbers, no formatting)
        const cleanCPF = (customer.cpf || '').replace(/\D/g, '');

        if (cleanCPF.length !== 11) {
            console.error(`❌ [CARTÃO ERROR] CPF inválido: ${customer.cpf} (limpo: ${cleanCPF})`);
            return res.status(400).json({
                error: 'CPF inválido',
                message: 'O CPF deve conter exatamente 11 dígitos.'
            });
        }

        const body = {
            transaction_amount: totalAmount,
            token: token,
            description: items.map(i => i.title).join(', '),
            installments: Number(installments),
            payment_method_id,
            issuer_id,
            binary_mode: true,
            external_reference: `ORDER-${Date.now()}`,
            notification_url: `${process.env.BASE_URL || 'https://teste-m1kq.onrender.com'}/api/webhooks/mercadopago`,
            statement_descriptor: 'GALOS MURA BRASIL',
            payer: {
                email: customer.email,
                first_name: customer.name.split(' ')[0],
                last_name: customer.name.split(' ').slice(1).join(' ') || 'User',
                identification: { type: 'CPF', number: cleanCPF }
            },
            additional_info: {
                ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                items: items.map((item, idx) => ({
                    id: item.id || `item-${idx}`,
                    title: item.title,
                    description: item.description || item.title,
                    category_id: 'digital_goods',
                    quantity: 1,
                    unit_price: Number(item.price)
                }))
            },
            metadata: { delivery_method: 'email', customer_phone: customer.phone }
        };

        // Add Device ID if provided (CRITICAL for Anti-Fraud)
        if (req.body.deviceId) {
            console.log(`📱 [CARTÃO] Device ID recebido: ${req.body.deviceId}`);
            // Note: Mercado Pago SDK v2 usually handles device_id automatically in the token if configured, 
            // but explicitly passing it in aditional_info or at root level depends on specific API version.
            // For /v1/payments, 'metadata' or 'additional_info' is safer if top-level property is restricted.
            // However, the standard way often involves 'device_id' at the root of the body object if the SDK generated it.
            // Let's try adding it to top level as 'device_id' is standard in MP API.
            body.additional_info.device_id = req.body.deviceId;
        }

        const response = await payment.create({ body });

        if (response.status === 'approved') {
            console.log(`✅ [CARTÃO] Pagamento aprovado! ID: ${response.id}`);
            logSale(customer, items, response.id, 'cartão');
            sendEmail(customer, items);
            res.json({ status: 'approved', id: response.id });

        } else {
            console.warn(`❌ [CARTÃO] Pagamento Recusado: ${response.status} (${response.status_detail})`);
            res.status(400).json({ status: response.status, status_detail: response.status_detail });
        }
    } catch (error) {
        console.error('❌ [CARTÃO ERROR] Falha Crítica:', error.message);

        // DEEP DEBUG LOGGING FOR USER
        if (error.response) {
            console.error('⚠️ [DEBUG MP RESPONSE] Data:', JSON.stringify(error.response.data || {}, null, 2));
            console.error('⚠️ [DEBUG MP RESPONSE] Status:', error.response.status);
        } else if (error.cause) {
            console.error('⚠️ [DEBUG MP CAUSE] Cause:', JSON.stringify(error.cause, null, 2));
        } else {
            console.error('⚠️ [DEBUG ERROR OBJ]', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }

        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.message,
            details: error.response ? error.response.data : (error.cause || 'No details')
        });
    }
});

app.get('/api/payment/:id', async (req, res) => {
    try {
        const result = await payment.get({ id: req.params.id });

        // Fallback: If approved but not logged, log it now
        if (result.status === 'approved') {
            const metadata = result.metadata || {};
            const customer = {
                name: metadata.customer_name || (result.payer && result.payer.first_name
                    ? `${result.payer.first_name} ${result.payer.last_name || ''}`.trim()
                    : 'Cliente'),
                email: metadata.customer_email || (result.payer && result.payer.email) || 'galosmurabrasill@gmail.com',
                phone: metadata.customer_phone || 'Sem Telefone'
            };
            const itemTitles = (result.description || 'Produto').split(', ');
            const items = itemTitles.map(title => ({
                title: title,
                price: result.transaction_amount / itemTitles.length
            }));

            logSale(customer, items, result.id, result.payment_method_id === 'pix' ? 'pix' : 'cartão');
        }


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

                // Reconstruct customer data - Prioritize metadata
                const customer = {
                    name: metadata.customer_name || (paymentResult.payer && paymentResult.payer.first_name
                        ? `${paymentResult.payer.first_name} ${paymentResult.payer.last_name || ''}`.trim()
                        : 'Cliente'),
                    email: metadata.customer_email || (paymentResult.payer && paymentResult.payer.email) || 'galosmurabrasill@gmail.com',
                    phone: metadata.customer_phone || 'Sem Telefone'
                };

                // Reconstruct items from description
                const itemTitles = (paymentResult.description || 'Produto').split(', ');
                const items = itemTitles.map(title => ({
                    title: title,
                    price: paymentResult.transaction_amount / itemTitles.length
                }));

                logSale(customer, items, paymentId, paymentResult.payment_method_id === 'pix' ? 'pix' : 'cartão');


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

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

console.log('⏳ Starting Mura Engine Server...');
app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(40));
    console.log(`🚀 Mura Engine Online!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Host: ${HOST}`);
    console.log(`📅 Time: ${new Date().toLocaleString()}`);
    console.log('='.repeat(40) + '\n');
});

