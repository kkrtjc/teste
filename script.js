document.addEventListener('DOMContentLoaded', () => {

    // --- 1. FAQ Accordion Logic ---
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const isOpen = item.classList.contains('active');

            // Close all others
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Toggle current if it wasn't open
            if (!isOpen) {
                item.classList.add('active');
            }
        });
    });

    // --- 2. Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- 3. Header Transparency ---
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(0, 0, 0, 0.98)';
            header.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
        } else {
            header.style.background = 'rgba(0, 0, 0, 0.8)';
            header.style.boxShadow = 'none';
        }
    });

    // --- 4. Testimonials (Infinite Carousel) ---
    const testimonials = [
        { text: '"Salvou minhas galinhas! Perdi 20 galinhas antes de ler esse guia."', author: 'Carlos Silva', location: 'Minas Gerais', stars: 5, avatar: 'carrosel/carlos.png' },
        { text: '"Muito bom, consegui identificar a doença da minha galinha na mesma hora."', author: 'Maria Santos', location: 'São Paulo', stars: 5, avatar: 'carrosel/maria.PNG' },
        { text: '"Vale cada centavo. Aprendi mais aqui do que em 2 anos criando galinhas."', author: 'João Oliveira', location: 'Bahia', stars: 5, avatar: 'carrosel/joao_new.jpg' },
        { text: '"O manejo correto mudou tudo aqui no sítio. Recomendo demais!"', author: 'Ana Costa', location: 'Goiás', stars: 5, avatar: 'carrosel/ana.png' },
        { text: '"Simples e direto. Parei de gastar com remédio errado."', author: 'Ricardo Lima', location: 'Paraná', stars: 5, avatar: 'carrosel/ricardo.jpeg' }
    ];

    const testimonialsTrack = document.getElementById('testimonials-track');

    function createTestimonialCard(t) {
        const starsHTML = '<i class="fa-solid fa-star" style="color: #FFD700;"></i>'.repeat(t.stars);
        const card = document.createElement('div');
        card.className = 'testimonial-card-original';
        // Fixed width for carousel items ensures smooth animation
        card.style.minWidth = '300px';
        card.style.maxWidth = '300px';
        card.style.textAlign = 'left';
        card.innerHTML = `
            <div style="font-size: 1.5rem; color: rgba(255,255,255,0.3); margin-bottom: 0.5rem;"><i class="fa-solid fa-quote-left"></i></div>
            <p style="font-style: italic; margin-bottom: 1.5rem; color: #eee; font-size: 0.95rem; min-height: 60px;">"${t.text}"</p>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; display: flex; align-items: center; gap: 1rem;">
                <div style="width: 45px; height: 45px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255,255,255,0.5); flex-shrink: 0;">
                    <img src="${t.avatar}" alt="${t.author}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${t.author}&background=random&color=fff'">
                </div>
                <div>
                    <strong style="display: block; color: #fff; font-size: 0.9rem;">${t.author}</strong>
                    <small style="color: rgba(255,255,255,0.6); font-size: 0.8rem;"><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> ${t.location}</small>
                    <div style="margin-top: 0.2rem; font-size: 0.7rem; color: #FFD700;">
                        ${starsHTML}
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    if (testimonialsTrack) {
        // Double the array to create seamless loop
        const loopContent = [...testimonials, ...testimonials, ...testimonials]; // Triple to be safe for wide screens

        loopContent.forEach(t => {
            testimonialsTrack.appendChild(createTestimonialCard(t));
        });
    }

    // --- 4.1 Floating Testimonials & Sales Notifications ---
    const toastContainer = document.getElementById('toast-container');

    // --- 4.2 Dynamic Home Products ---
    renderHomeProducts();



    // --- 6. Sticky CTA Logic ---
    const stickyCta = document.querySelector('.sticky-cta-bar');
    const heroSection = document.querySelector('.hero');

    if (stickyCta && heroSection) {
        window.addEventListener('scroll', () => {
            const triggerPoint = heroSection.offsetHeight - 200; // Show a bit before hero ends
            if (window.scrollY > triggerPoint) {
                stickyCta.classList.add('visible');
            } else {
                stickyCta.classList.remove('visible');
            }
        });
    }





    // A) Track "InitiateCheckout" on all Buy Buttons
    const buyButtons = document.querySelectorAll('a[href*="kiwify"]');
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Facebook
            if (typeof fbq === 'function') {
                fbq('track', 'InitiateCheckout');
            }
            // TikTok
            if (typeof ttq === 'object') {
                ttq.track('ClickButton');
                ttq.track('InitiateCheckout');
            }
        });
    });

    // B) Track "Time on Page: 15 Seconds"
    setTimeout(() => {
        if (typeof fbq === 'function') {
            fbq('trackCustom', 'TimeSpent_15s');
            fbq('track', 'ViewContent');
        }
    }, 15000);

});

/* 
========================================
   CHECKOUT SYSTEM INTEGRATION
========================================
*/

// Initialize Mercado Pago (Public Key - PRODUCTION)
const mp = new MercadoPago('APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5');

const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.querySelector('.close-modal');
const checkoutTotalDisplays = document.querySelectorAll('.checkout-total-display');
const paymentForm = document.getElementById('payment-form');

// Utils
const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// State Management
let cart = {
    mainProduct: null,
    bumps: [] // IDs of selected bumps
};

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://mura-engine-api.onrender.com'; // TODO: Substituir após deploy inicial

// Open Checkout Modal
async function openCheckout(productId) {
    if (!checkoutModal) return;

    // 1. Show Secure Loading First
    const secureOverlay = document.getElementById('secure-loading');
    const lockScroll = () => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    };

    if (secureOverlay) {
        secureOverlay.classList.add('active');
        lockScroll();
        const secureText = document.getElementById('secure-text');
        setTimeout(() => secureText.innerText = "Criptografando dados...", 1000);
        setTimeout(() => secureText.innerText = "Conexão Segura Estabelecida.", 2000);
    }

    try {
        // 2. Fetch Dynamic Data
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const productData = await response.json();

        if (productData.error) throw new Error(productData.error);

        // 3. Update State
        cart.mainProduct = { ...productData, id: productId };
        cart.bumps = []; // Reset selected bumps

        // 4. Update UI
        document.getElementById('checkout-product-name').innerText = productData.title;
        document.getElementById('checkout-product-price-display').innerText = formatBRL(productData.price);

        renderOrderBumps(productData.fullBumps);
        updateTotal();

        // 5. Transition to Modal
        setTimeout(() => {
            if (secureOverlay) secureOverlay.classList.remove('active');
            checkoutModal.classList.add('active');
            switchMethod('pix');
        }, 2200);

    } catch (err) {
        console.error("Error opening checkout:", err);
        alert("Erro ao carregar checkout. Tente novamente.");
        if (secureOverlay) secureOverlay.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}

function renderOrderBumps(bumps) {
    const area = document.getElementById('order-bump-area');
    area.innerHTML = (bumps || []).map(bump => `
        <div class="order-bump-container" onclick="toggleBump('${bump.id}')" style="display: flex; align-items: center; gap: 12px;">
            <input type="checkbox" class="order-bump-checkbox" id="bump-chk-${bump.id}" ${cart.bumps.includes(bump.id) ? 'checked' : ''}>
            ${bump.image ? `<img src="${bump.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);">` : ''}
            <div class="order-bump-content">
                <span class="order-bump-tag">${bump.tag || 'OFERTA ÚNICA'}</span>
                <strong class="order-bump-title" style="display: block;">${bump.title}</strong>
                <span class="order-bump-description" style="display: block; font-size: 0.8rem; color: #888;">${bump.description}</span>
                <span class="order-bump-price" style="color: var(--color-secondary); font-weight: 800;">+ ${formatBRL(bump.price)}</span>
            </div>
        </div>
    `).join('');
}

function toggleBump(bumpId) {
    const chk = document.getElementById(`bump-chk-${bumpId}`);
    // If called from the container click, 'chk.checked' hasn't changed yet 
    // BUT we manually set it in toggleBump if we want.
    // Let's make it simpler:
    const isSelected = cart.bumps.includes(bumpId);

    if (isSelected) {
        cart.bumps = cart.bumps.filter(id => id !== bumpId);
        if (chk) chk.checked = false;
    } else {
        cart.bumps.push(bumpId);
        if (chk) chk.checked = true;
    }
    updateTotal();
}

function updateTotal() {
    let total = cart.mainProduct.price;
    cart.bumps.forEach(id => {
        const b = cart.mainProduct.fullBumps.find(x => x.id === id);
        if (b) total += b.price;
    });

    const priceText = formatBRL(total);
    checkoutTotalDisplays.forEach(el => el.innerText = priceText);
    updateInstallments(total);
}

// Close Modal Logic
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = ''; // Unlock html

        // Reset Views
        document.getElementById('pix-area').style.display = 'block';
        document.getElementById('pix-result').classList.add('hidden');
        document.getElementById('payment-form').reset();
    });
}

// --- Payment Method Tabs ---
const methodBtns = document.querySelectorAll('.method-btn');
methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const method = btn.getAttribute('data-method');
        switchMethod(method);
    });
});

function switchMethod(method) {
    // Buttons UI
    methodBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.method-btn[data-method="${method}"]`).classList.add('active');

    // Areas UI
    const pixArea = document.getElementById('pix-area');
    const cardArea = document.getElementById('card-area');

    if (method === 'pix') {
        pixArea.classList.remove('hidden');
        cardArea.classList.add('hidden');
    } else {
        pixArea.classList.add('hidden');
        cardArea.classList.remove('hidden');
    }
}

function updateInstallments(price) {
    const select = document.getElementById('card-installments');
    select.innerHTML = '';

    // Simple logic: up to 12x with 2% interest/mo (Simulation)
    for (let i = 1; i <= 12; i++) {
        let amount;
        let text;

        if (i === 1) {
            amount = price;
            text = `1x de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Sem juros)`;
        } else {
            // Simulated simple interest
            const total = price * (1 + (0.02 * i));
            const parcel = total / i;
            amount = total;
            text = `${i}x de ${parcel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
        }

        const option = document.createElement('option');
        option.value = i;
        option.innerText = text;
        select.appendChild(option);
    }
}

// --- Payment Submission Handlers ---

// 1. PIX handler
document.getElementById('btn-pay-pix').addEventListener('click', async (e) => {
    e.preventDefault();
    handlePayment('pix');
});

// 2. CARD handler
document.getElementById('btn-pay-card').addEventListener('click', async (e) => {
    e.preventDefault();
    handlePayment('card');
});

async function handlePayment(method) {
    const customer = {
        name: document.getElementById('payer-name').value,
        cpf: document.getElementById('payer-cpf').value ? document.getElementById('payer-cpf').value.replace(/\D/g, '') : '',
        phone: document.getElementById('payer-phone').value ? document.getElementById('payer-phone').value.replace(/\D/g, '') : '',
        email: document.getElementById('payer-email').value
    };

    if (!customer.name || !customer.cpf || !customer.email) {
        alert('Por favor, preencha seus dados pessoais (Nome, CPF, Email).');
        return;
    }

    // Build Items List
    const items = [{
        id: cart.mainProduct.id,
        title: cart.mainProduct.title,
        price: cart.mainProduct.price
    }];

    cart.bumps.forEach(bumpId => {
        const bump = cart.mainProduct.fullBumps.find(b => b.id === bumpId);
        if (bump) {
            items.push({
                id: bump.id,
                title: bump.title,
                price: bump.price
            });
        }
    });

    if (method === 'pix') {
        const btn = document.getElementById('btn-pay-pix');
        const originalText = btn.innerText;
        btn.innerText = 'Gerando Pix...';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/api/checkout/pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, customer, deliveryMethod: 'email' })
            });

            const data = await response.json();

            if (data.qr_code_base64) {
                document.getElementById('pix-area').classList.add('hidden');
                document.getElementById('pix-result').classList.remove('hidden');

                document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qr_code_base64}`;
                document.getElementById('pix-copy-paste').value = data.qr_code;

                // Copy Logic
                const copyBtn = document.getElementById('btn-copy-pix');
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(data.qr_code);
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> COPIADO COM SUCESSO!';
                    copyBtn.classList.add('copied');

                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> COPIAR CÓDIGO PIX';
                        copyBtn.classList.remove('copied');
                    }, 3000);
                };

                // POLLING: Check status every 4 seconds
                const paymentId = data.id;
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API_URL}/api/payment/${paymentId}`);
                        const statusData = await statusRes.json();

                        console.log("Checking Pix Status:", statusData.status);

                        if (statusData.status === 'approved') {
                            clearInterval(pollInterval);
                            const productIds = items.map(i => i.id).join(',');
                            window.location.href = `obrigado.html?product_id=${productIds}`;
                        }
                    } catch (err) {
                        console.error("Polling error:", err);
                    }
                }, 4000);

            } else {
                alert('Erro ao gerar Pix.');
                btn.disabled = false;
                btn.innerText = originalText;
            }

        } catch (error) {
            console.error(error);
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerText = originalText;
        }

    } else if (method === 'card') {
        const btn = document.getElementById('btn-pay-card');
        const originalText = btn.innerText;
        btn.innerText = 'Processando...';
        btn.disabled = true;

        try {
            // 1. Create Card Token
            const token = await mp.createCardToken({
                cardNumber: document.getElementById('card-number').value.replace(/\s/g, ''),
                cardholderName: document.getElementById('card-holder').value,
                cardExpirationMonth: document.getElementById('card-expiration').value.split('/')[0],
                cardExpirationYear: '20' + document.getElementById('card-expiration').value.split('/')[1], // Assuming MM/YY format input
                securityCode: document.getElementById('card-cvv').value,
                identificationType: 'CPF', // Hardcoded for simplicity as standard in Brazil
                identificationNumber: document.getElementById('payer-cpf').value.replace(/\D/g, '') // Use the main CPF field
            });

            console.log("Token generated:", token.id);

            // 2. Detect Payment Method (Simple Regex Helper)
            const bin = document.getElementById('card-number').value.replace(/\D/g, '').substring(0, 6);
            const paymentMethodId = detectPaymentMethod(bin);

            if (!paymentMethodId) {
                alert('Bandeira do cartão não identificada. Verifique o número.');
                btn.disabled = false;
                btn.innerText = originalText;
                return;
            }

            // 3. Send Token to Backend
            const response = await fetch(`${API_URL}/api/checkout/card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    customer,
                    token: token.id,
                    installments: document.getElementById('card-installments').value,
                    payment_method_id: paymentMethodId,
                    issuer_id: null
                })
            });

            const result = await response.json();

            if (result.status === 'approved') {
                const productIds = items.map(i => i.id).join(',');
                window.location.href = `obrigado.html?product_id=${productIds}`;
            } else {
                alert('Pagamento Recusado: ' + (result.status_detail || 'Verifique os dados.'));
                btn.disabled = false;
                btn.innerText = originalText;
            }

        } catch (e) {
            console.error(e);
            alert('Erro ao processar cartão: ' + (e.message || 'Verifique os dados.'));
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}

// Helper: Simple Bin Detection for common BR cards
function detectPaymentMethod(bin) {
    if (!bin || bin.length < 6) return null;

    // Regex Patterns
    if (/^4/.test(bin)) return 'visa';
    if (/^5[1-5]/.test(bin) || /^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/.test(bin)) return 'master';
    if (/^3[47]/.test(bin)) return 'amex';
    if (/^636368|^438935|^504175|^451416|^636297|^5067|^4576|^4011/.test(bin)) return 'elo';
    if (/^606282|^3841/.test(bin)) return 'hipercard';

    return 'master'; // Fallback to master if unsure (common in test), or could return null to force verify
}

/* 
========================================
   SMART INPUT MASKS & VALIDATION
========================================
*/
const masks = {
    cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
    phone: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15),
    card: v => v.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19),
    date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5),
    cvv: v => v.replace(/\D/g, '').slice(0, 4)
};

const validate = {
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    cpf: v => v.replace(/\D/g, '').length === 11,
    phone: v => v.replace(/\D/g, '').length >= 10,
    date: v => v.length === 5,
    cvv: v => v.length >= 3,
    name: v => v.trim().split(' ').length >= 2,
    card: v => v.replace(/\D/g, '').length >= 13
};

function setupFields() {
    const fields = [
        { id: 'payer-cpf', type: 'cpf' },
        { id: 'payer-phone', type: 'phone' },
        { id: 'payer-email', type: 'email' },
        { id: 'payer-name', type: 'name' },
        { id: 'card-number', type: 'card' },
        { id: 'card-expiration', type: 'date' },
        { id: 'card-cvv', type: 'cvv' },
        { id: 'card-holder', type: 'name' }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        el.addEventListener('input', e => {
            if (masks[f.type]) e.target.value = masks[f.type](e.target.value);
            const isValid = validate[f.type] ? validate[f.type](e.target.value) : e.target.value.length > 3;
            el.classList.toggle('valid', isValid);
            el.classList.toggle('invalid', !isValid && e.target.value.length > 0);
        });
    });
}
setupFields();

// --- DYNAMIC HOME PRODUCTS RENDERING ---
async function renderHomeProducts() {
    const container = document.getElementById('home-products-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/api/config`);
        const db = await res.json();
        const products = db.products;

        container.innerHTML = ''; // Clear

        Object.keys(products).forEach(id => {
            const p = products[id];
            const card = document.createElement('div');
            card.className = `price-card ${p.isFeatured ? 'featured' : ''}`;
            if (p.isFeatured) card.id = 'offer-focus';

            const featuresHTML = (p.features || []).map(f => `<li><span class="check-icon">✓</span> ${f}</li>`).join('');

            const priceInteger = Math.floor(p.price);
            const priceDecimal = (p.price % 1).toFixed(2).split('.')[1];

            let coverHTML = '';
            if (p.cover === 'combo') {
                coverHTML = `
                    <div class="combo-visual">
                        <img src="capadospintinhos.png" class="combo-img" alt="Manejo" loading="lazy" width="120" height="160">
                        <img src="capadasdoencas.png" class="combo-img" alt="Doenças" loading="lazy" width="120" height="160">
                    </div>
                `;
            } else {
                coverHTML = `<img src="${p.cover}" alt="${p.title}" loading="lazy" style="max-width: 120px; margin: 10px auto; display: block;" width="120" height="160">`;
            }

            card.innerHTML = `
                ${p.isFeatured ? `<span class="badge-featured">${p.badge || 'MAIS VENDIDO'}</span>` : ''}
                <h3 class="price-title">${p.title}</h3>
                ${p.description ? `<p>${p.isFeatured ? `<strong>${p.description}</strong>` : p.description}</p>` : ''}
                
                ${coverHTML}

                ${p.originalPrice ? `<div style="text-decoration: line-through; color: #999; margin-top: 10px;">De R$ ${p.originalPrice.toFixed(2).replace('.', ',')}</div>` : ''}
                
                <span class="price-amount" ${p.isFeatured ? 'style="color: var(--color-secondary);"' : ''}>
                    R$ ${priceInteger}<small>,${priceDecimal}</small>
                </span>
                
                ${p.isFeatured ? `<p style="font-size: 0.9rem; color: #666;">ou 12x de ${formatBRL(p.price / 10)}</p>` : ''}

                <ul class="price-features" ${p.isFeatured ? 'style="margin-top: 1.5rem;"' : ''}>
                    ${featuresHTML}
                </ul>
                
                <button onclick="openCheckout('${id}')" class="btn ${p.isFeatured ? 'btn-primary btn-pulse' : 'btn-secondary'}" style="width:100%;">
                    ${p.isFeatured ? 'QUERO SALVAR MINHA CRIAÇÃO' : 'COMPRAR AGORA'}
                </button>
            `;

            container.appendChild(card);
        });
    } catch (e) {
        console.error("Error rendering home products:", e);
    }
}

