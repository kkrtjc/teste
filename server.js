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
app.use(cors());
app.use(bodyParser.json());

// Paths
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const HISTORY_PATH = path.join(__dirname, 'data', 'history.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
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
    const history = getHistory();
    history.push({
        date: new Date().toISOString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        items: items.map(i => i.title),
        total: items.reduce((acc, i) => acc + Number(i.price), 0)
    });
    saveHistory(history);
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
    // Basic protection could be added via query param or headers
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

// Serve Static Files
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

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
            }
        };
        const response = await payment.create({ body });
        if (response.status === 'approved') {
            logSale(customer, items); // LOG SUCCESSFUL CARD SALE
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
    const topic = req.query.topic || req.query.type;
    if (topic === 'payment') {
        const paymentId = req.query.id || req.body.data.id;
        try {
            const paymentResult = await payment.get({ id: paymentId });
            if (paymentResult.status === 'approved') {
                console.log(`✅ Pagamento Aprovado! ID: ${paymentId}`);
                // Record from metadata if available (for Pix)
                if (paymentResult.metadata && paymentResult.metadata.customer_phone) {
                    const customer = {
                        name: `${paymentResult.payer.first_name} ${paymentResult.payer.last_name}`,
                        email: paymentResult.payer.email,
                        phone: paymentResult.metadata.customer_phone
                    };
                    // Reconstruct items from description (simple version)
                    const items = [{ title: paymentResult.description, price: paymentResult.transaction_amount }];
                    logSale(customer, items);
                }
            }
            res.sendStatus(200);
        } catch (error) {
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(200);
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`\n🚀 Mura Engine running on http://localhost:${PORT}`));

