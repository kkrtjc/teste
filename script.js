// --- 1. GLOBAL CONFIG & STATE ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://teste-m1kq.onrender.com';

let cart = {
    mainProduct: null,
    bumps: [] // IDs of selected bumps
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. FAQ Accordion Logic ---
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const isOpen = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(otherItem => otherItem.classList.remove('active'));
            if (!isOpen) item.classList.add('active');
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
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
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
    if (testimonialsTrack) {
        const loopContent = [...testimonials, ...testimonials, ...testimonials];
        loopContent.forEach(t => {
            const starsHTML = '<i class="fa-solid fa-star" style="color: #FFD700;"></i>'.repeat(t.stars);
            const card = document.createElement('div');
            card.className = 'testimonial-card-original';
            card.style.minWidth = '300px';
            card.style.maxWidth = '300px';
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
                        <div style="margin-top: 0.2rem; font-size: 0.7rem; color: #FFD700;">${starsHTML}</div>
                    </div>
                </div>
            `;
            testimonialsTrack.appendChild(card);
        });
    }

    // --- 5. Initializations ---
    renderHomeProducts();
    setupFields();

    // --- 6. Sticky CTA Logic ---
    const stickyCta = document.querySelector('.sticky-cta-bar');
    const heroSection = document.querySelector('.hero');
    if (stickyCta && heroSection) {
        window.addEventListener('scroll', () => {
            const triggerPoint = heroSection.offsetHeight - 200;
            if (window.scrollY > triggerPoint) stickyCta.classList.add('visible');
            else stickyCta.classList.remove('visible');
        });
    }

    // Pixels tracking
    setTimeout(() => {
        if (typeof fbq === 'function') {
            fbq('trackCustom', 'TimeSpent_15s');
            fbq('track', 'ViewContent');
        }
    }, 15000);
});

// --- 2. CHECKOUT & API LOGIC ---

const mp = new MercadoPago('APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5');
const checkoutModal = document.getElementById('checkout-modal');

async function openCheckout(productId) {
    console.log("🛒 Iniciando checkout para:", productId);
    if (!checkoutModal) return;

    const secureOverlay = document.getElementById('secure-loading');
    const lockScroll = () => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    };

    if (secureOverlay) {
        secureOverlay.classList.add('active');
        lockScroll();
        const secureText = document.getElementById('secure-text');
        if (secureText) {
            setTimeout(() => secureText.innerText = "Criptografando dados...", 1000);
            setTimeout(() => secureText.innerText = "Conexão Segura Estabelecida.", 2000);
        }
    }

    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const productData = await response.json();

        if (productData.error) throw new Error(productData.error);

        cart.mainProduct = { ...productData, id: productId };
        cart.bumps = [];

        document.getElementById('checkout-product-name').innerText = productData.title;
        document.getElementById('checkout-product-price-display').innerText = formatBRL(productData.price);

        const iconContainer = document.getElementById('product-icon-container');
        if (iconContainer) {
            if (productData.cover === 'combo') {
                iconContainer.innerHTML = `
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <img src="capadospintinhos.png" alt="Manejo" style="width: 30px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <img src="capadasdoencas.png" alt="Doenças" style="width: 30px; height: 40px; object-fit: cover; border-radius: 4px;">
                    </div>`;
            } else {
                iconContainer.innerHTML = `<img src="${productData.cover}" style="width: 50px; height: 65px; object-fit: cover; border-radius: 6px;">`;
            }
        }

        renderOrderBumps(productData.fullBumps);
        updateTotal();
        switchMethod('pix');

        // --- Premium Animation Sequence ---
        setTimeout(() => {
            // 1. Fade Out Secure Loading
            if (secureOverlay) secureOverlay.classList.remove('active');

            // 2. Start Logo Slide Animation
            const logoOverlay = document.getElementById('checkout-logo-overlay');
            if (logoOverlay) {
                logoOverlay.classList.add('active');

                // 3. Wait for slide and pulse, then run left
                setTimeout(() => {
                    logoOverlay.classList.add('run-left');

                    // Smooth overlap: Show checkout slightly before logo is fully gone
                    setTimeout(() => {
                        logoOverlay.classList.remove('active', 'run-left');
                        checkoutModal.classList.add('active');
                    }, 400); // overlap timing
                }, 2600); // total sequence timing
            } else {
                checkoutModal.classList.add('active');
            }
        }, 1800); // secure lock duration

    } catch (err) {
        console.error("Error opening checkout:", err);
        alert("Erro ao carregar checkout. Verifique sua conexão.");
        if (secureOverlay) secureOverlay.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}

function renderOrderBumps(bumps) {
    const area = document.getElementById('order-bump-area');
    if (!area) return;
    area.innerHTML = (bumps || []).map(bump => {
        let imgSrc = bump.image;
        if (!imgSrc) {
            if (bump.id === 'ebook-doencas' || bump.id === 'bump-doencas') imgSrc = 'capadasdoencas.png';
            else if (bump.id === 'ebook-manejo' || bump.id === 'bump-manejo') imgSrc = 'capadospintinhos.png';
        }

        return `
            <div class="order-bump-container" onclick="toggleBump('${bump.id}')">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="checkbox" class="order-bump-checkbox" id="bump-chk-${bump.id}" ${cart.bumps.includes(bump.id) ? 'checked' : ''}>
                    ${imgSrc ? `<img src="${imgSrc}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover;">` : ''}
                    <div class="order-bump-content">
                        <span class="order-bump-tag">${bump.tag || 'OFERTA ÚNICA'}</span>
                        <strong class="order-bump-title" style="display: block; color: #fff;">${bump.title}</strong>
                        <span class="order-bump-description" style="display: block; color: rgba(255,255,255,0.5); font-size: 0.8rem;">${bump.description}</span>
                        <span class="order-bump-price" style="color: var(--color-secondary); font-weight: 800;">+ ${formatBRL(bump.price)}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function toggleBump(bumpId) {
    const idx = cart.bumps.indexOf(bumpId);
    if (idx > -1) cart.bumps.splice(idx, 1);
    else cart.bumps.push(bumpId);

    const chk = document.getElementById(`bump-chk-${bumpId}`);
    if (chk) chk.checked = cart.bumps.includes(bumpId);
    updateTotal();
}

function updateTotal() {
    let total = cart.mainProduct.price;
    cart.bumps.forEach(id => {
        const b = cart.mainProduct.fullBumps.find(x => x.id === id);
        if (b) total += b.price;
    });

    document.querySelectorAll('.checkout-total-display').forEach(el => el.innerText = formatBRL(total));
    updateInstallments(total);
}

function formatBRL(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

async function renderHomeProducts() {
    const container = document.getElementById('home-products-container');
    if (!container) return;

    try {
        console.log("Iniciando carga de ofertas de:", `${API_URL}/api/config`);
        const res = await fetch(`${API_URL}/api/config`);
        if (!res.ok) throw new Error("Fetch failed");

        const db = await res.json();
        const products = db.products;
        container.innerHTML = '';

        Object.keys(products).forEach(id => {
            const p = products[id];
            const card = document.createElement('div');
            card.className = `price-card ${p.isFeatured ? 'featured' : ''}`;
            if (p.isFeatured) card.id = 'offer-focus';

            const featuresHTML = (p.features || []).map(f => `<li><span class="check-icon">✓</span> ${f}</li>`).join('');

            let coverHTML = '';
            if (p.cover === 'combo') {
                coverHTML = `
                    <div class="combo-visual">
                        <img src="capadospintinhos.png" class="combo-img" alt="Manejo">
                        <img src="capadasdoencas.png" class="combo-img" alt="Doenças">
                    </div>`;
            } else {
                coverHTML = `<img src="${p.cover}" alt="${p.title}" style="max-width: 120px; margin: 10px auto; display: block;">`;
            }

            card.innerHTML = `
                ${p.isFeatured ? `<span class="badge-featured">${p.badge || 'MAIS VENDIDO'}</span>` : ''}
                <h3 class="price-title">${p.title}</h3>
                <p>${p.description || ''}</p>
                ${coverHTML}
                ${p.originalPrice ? `<div style="text-decoration: line-through; color: #999; margin-top: 10px;">De R$ ${p.originalPrice.toFixed(2).replace('.', ',')}</div>` : ''}
                <span class="price-amount" ${p.isFeatured ? 'style="color: var(--color-secondary);"' : ''}>
                    R$ ${Math.floor(p.price)}<small>,${(p.price % 1).toFixed(2).split('.')[1]}</small>
                </span>
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
        console.error("ERRO CARGA OFERTAS:", e);
        container.innerHTML = `<p style="color: #fff; text-align: center; grid-column: 1/-1; padding: 20px;">Não foi possível carregar as ofertas. <br><small>Verifique se o servidor no Render está online.</small></p>`;
    }
}

// --- 3. PAYMENT HANDLING ---

function switchMethod(method) {
    const btns = document.querySelectorAll('.method-btn');
    btns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.method-btn[data-method="${method}"]`)?.classList.add('active');

    const pixArea = document.getElementById('pix-area');
    const cardArea = document.getElementById('card-area');

    if (method === 'pix') {
        if (pixArea) { pixArea.style.display = 'block'; setTimeout(() => pixArea.style.opacity = '1', 50); }
        if (cardArea) { cardArea.style.opacity = '0'; setTimeout(() => cardArea.style.display = 'none', 300); }
    } else {
        if (cardArea) { cardArea.style.display = 'block'; setTimeout(() => cardArea.style.opacity = '1', 50); }
        if (pixArea) { pixArea.style.opacity = '0'; setTimeout(() => pixArea.style.display = 'none', 300); }
    }
}

function updateInstallments(price) {
    const select = document.getElementById('card-installments');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const total = i === 1 ? price : price * (1 + (0.015 * i));
        const parcel = total / i;
        const option = document.createElement('option');
        option.value = i;
        option.innerText = `${i}x de ${formatBRL(parcel)} ${i === 1 ? '(Sem juros)' : ''}`;
        select.appendChild(option);
    }
}

async function handlePayment(method) {
    const customer = {
        name: document.getElementById('payer-name').value,
        cpf: document.getElementById('payer-cpf').value ? document.getElementById('payer-cpf').value.replace(/\D/g, '') : '',
        phone: document.getElementById('payer-phone').value ? document.getElementById('payer-phone').value.replace(/\D/g, '') : '',
        email: document.getElementById('payer-email').value
    };

    if (!customer.name || !customer.cpf || !customer.email || customer.cpf.length < 11) {
        alert('Por favor, preencha corretamente Nome, CPF e Email.');
        return;
    }

    const items = [{ id: cart.mainProduct.id, title: cart.mainProduct.title, price: cart.mainProduct.price }];
    cart.bumps.forEach(id => {
        const b = cart.mainProduct.fullBumps.find(x => x.id === id);
        if (b) items.push({ id: b.id, title: b.title, price: b.price });
    });

    if (method === 'pix') {
        const btn = document.getElementById('btn-pay-pix');
        const originalText = btn.innerText;
        btn.innerText = 'Gerando Pix...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/api/checkout/pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, customer })
            });
            const data = await res.json();

            if (data.qr_code) {
                document.getElementById('checkout-main-view').classList.add('hidden');
                document.getElementById('pix-result').classList.remove('hidden');
                document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qr_code_base64}`;
                document.getElementById('pix-copy-paste').value = data.qr_code;

                const copyBtn = document.getElementById('btn-copy-pix');
                if (copyBtn) {
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(data.qr_code);
                        copyBtn.innerHTML = 'COPIADO!';
                        setTimeout(() => copyBtn.innerHTML = 'COPIAR CÓDIGO PIX', 2000);
                    };
                }

                const poll = setInterval(async () => {
                    try {
                        const s = await fetch(`${API_URL}/api/payment/${data.id}`);
                        const sd = await s.json();
                        if (sd.status === 'approved') {
                            clearInterval(poll);
                            window.location.href = `downloads.html?items=${items.map(i => i.id).join(',')}`;
                        }
                    } catch (e) { }
                }, 4000);
            }
        } catch (e) { alert('Erro ao gerar Pix.'); btn.disabled = false; btn.innerText = originalText; }
    } else {
        // CARD PAYMENT (Restored complex logic)
        const btn = document.getElementById('btn-pay-card');
        const originalText = btn.innerText;
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const cardHolder = document.getElementById('card-holder').value;
        const cardExpiry = document.getElementById('card-expiration').value;
        const cardCVV = document.getElementById('card-cvv').value;

        btn.innerText = 'Processando...';
        btn.disabled = true;

        try {
            const cardTokenParams = {
                cardNumber,
                cardholderName: cardHolder,
                cardExpirationMonth: cardExpiry.split('/')[0],
                cardExpirationYear: '20' + cardExpiry.split('/')[1],
                securityCode: cardCVV,
                identificationType: 'CPF',
                identificationNumber: customer.cpf
            };

            const token = await mp.createCardToken(cardTokenParams);
            if (!token || !token.id) throw new Error("Erro ao gerar token do cartão.");

            const res = await fetch(`${API_URL}/api/checkout/card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items, customer, token: token.id,
                    installments: document.getElementById('card-installments').value,
                    payment_method_id: 'master', // Dynamic detection could be added here
                    issuer_id: null
                })
            });

            const result = await res.json();
            if (result.status === 'approved') {
                window.location.href = `downloads.html?items=${items.map(i => i.id).join(',')}`;
            } else {
                alert('Pagamento Recusado. Verifique os dados ou tente Pix.');
                btn.disabled = false;
                btn.innerText = originalText;
            }
        } catch (e) {
            alert('Erro no cartão: ' + e.message);
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}

// Event Listeners
document.getElementById('btn-pay-pix')?.addEventListener('click', (e) => { e.preventDefault(); handlePayment('pix'); });
document.getElementById('btn-pay-card')?.addEventListener('click', (e) => { e.preventDefault(); handlePayment('card'); });
document.querySelectorAll('.method-btn').forEach(b => b.addEventListener('click', () => switchMethod(b.dataset.method)));
document.querySelector('.close-modal')?.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
});

// --- 4. MASKS ---
const masks = {
    cpf: v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    phone: v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'),
    card: v => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim(),
    date: v => v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d{2})/, '$1/$2'),
    cvv: v => v.replace(/\D/g, '').slice(0, 4)
};

function setupFields() {
    ['payer-cpf', 'payer-phone', 'card-number', 'card-expiration', 'card-cvv'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const type = id.split('-').pop();
        el.addEventListener('input', e => {
            let val = e.target.value;
            if (masks[type]) e.target.value = masks[type](val);
        });
    });
}
