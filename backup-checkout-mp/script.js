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
        { text: '"Salvou minhas galinhas! Perdi 20 galinhas antes de ler esse guia."', author: 'Carlos Silva', location: 'Minas Gerais', stars: 5, avatar: 'carlos.png' },
        { text: '"Muito bom, consegui identificar a doença da minha galinha na mesma hora."', author: 'Maria Santos', location: 'São Paulo', stars: 5, avatar: 'maria.PNG' },
        { text: '"Vale cada centavo. Aprendi mais aqui do que em 2 anos criando galinhas."', author: 'João Oliveira', location: 'Bahia', stars: 5, avatar: 'joao.jpeg' },
        { text: '"O manejo correto mudou tudo aqui no sítio. Recomendo demais!"', author: 'Pedro H.', location: 'Goiás', stars: 5, avatar: '' },
        { text: '"Simples e direto. Parei de gastar com remédio errado."', author: 'Ana Costa', location: 'Paraná', stars: 5, avatar: '' }
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
                    <img src="${t.avatar}" alt="${t.author}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${t.author}&background=random&color=fff'">
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

    // Fake Sales Data Generator
    const firstNames = ['Pedro', 'Lucas', 'Fernanda', 'Marcos', 'Juliana', 'Roberto', 'Ana', 'Paulo', 'Ricardo', 'Beatriz'];
    const cities = ['São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR', 'Salvador, BA', 'Goiânia, GO', 'Recife, PE'];

    function getRandomSale() {
        const name = firstNames[Math.floor(Math.random() * firstNames.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        return {
            author: name,
            location: city,
            type: 'sale',
            text: 'Acabou de comprar o <strong>Combo Protocolo Elite!</strong> 🐔'
        };
    }

    function showRandomToast() {
        if (!toastContainer) return;

        // Randomly decide: 60% chance of "Sale", 40% chance of "Testimonial"
        const isSale = Math.random() > 0.4;
        let data;
        let iconHtml = '';

        if (isSale) {
            data = getRandomSale();
            iconHtml = '<i class="fa-solid fa-cart-shopping" style="color: #4CAF50; font-size: 0.8rem;"></i> <span style="font-size: 0.75rem; color: #4CAF50; font-weight:700;">COMPRA VERIFICADA</span>';
        } else {
            const t = testimonials[Math.floor(Math.random() * testimonials.length)];
            data = {
                author: t.author,
                location: t.location, // Assuming t has location
                type: 'review',
                text: `"${t.text}"`,
                avatar: t.avatar,
                stars: t.stars
            };
            iconHtml = '<div style="font-size: 0.7rem; color: #FFD700; margin-top: 2px;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>';
        }

        const toast = document.createElement('div');
        toast.className = 'float-toast';
        // Sales get a specific icon or avatar style
        const avatarSrc = data.type === 'review' ? data.avatar : `https://ui-avatars.com/api/?name=${data.author}&background=D4AF37&color=000`;

        // Compact Layout:
        // [Avatar] [Name • Loc • Time]
        //          [Text ........ Icon]

        toast.innerHTML = `
            <img src="${avatarSrc}" onerror="this.src='https://ui-avatars.com/api/?name=${data.author}&background=random&color=fff'">
            <div class="float-toast-content" style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap: 5px; font-size: 0.75rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <strong style="color: var(--color-primary); font-size: 0.85rem;">${data.author}</strong>
                    <span>•</span>
                    <span style="overflow:hidden; text-overflow:ellipsis;">${data.location}</span>
                    ${data.type === 'sale' ? `<span style="opacity:0.6; font-size:0.7rem;">• Agora</span>` : ''}
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px; margin-top: 2px;">
                    ${data.type === 'sale'
                ? `<p style="color: var(--color-primary); font-size: 0.8rem; margin:0; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${data.text.replace('Acabou de comprar o', 'Comprou')}</p>`
                : `<p style="font-style:italic; font-size: 0.8rem; margin:0; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${data.text}</p>`
            }
                    <div style="flex-shrink:0;">${iconHtml}</div>
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Animate In
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Remove after 3 seconds (User Request)
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 500); // 500ms transition
        }, 3000);
    }

    // Start loop
    setTimeout(() => {
        showRandomToast();
        setInterval(showRandomToast, 6000); // Faster frequency (6s)
    }, 3000);

    // --- 5. Countdown Timer ---
    function startCountdown(duration) {
        let timer = duration, hours, minutes, seconds;
        const displays = document.querySelectorAll('.countdown-timer');

        setInterval(function () {
            hours = parseInt(timer / 3600, 10);
            minutes = parseInt((timer % 3600) / 60, 10);
            seconds = parseInt(timer % 60, 10);

            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            displays.forEach(display => {
                display.textContent = hours + "h : " + minutes + "m : " + seconds + "s";
            });

            if (--timer < 0) {
                timer = duration;
            }
        }, 1000);
    }
    // Start 24h timer
    startCountdown(24 * 60 * 60);

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

    // --- 7. Combo Popup Logic ---
    const popup = document.getElementById('combo-popup');
    const closePopupBtn = document.getElementById('close-popup');
    const triggerSection = document.querySelector('.product-showcase');

    if (popup && triggerSection) {
        const showPopup = () => {
            // REMOVED SESSION STORAGE CHECK FOR TESTING - User requested it "apareça" (ensure it works)
            // Re-enabling in prod, but for now lets keep the logic strict? 
            // Actually user said "certifique-se de que o popup apareça", implies it might not be appearing.
            // I will keep the check but ensure the trigger is robust.
            if (sessionStorage.getItem('popupShown')) return;

            popup.classList.add('active');
            document.body.style.overflow = 'hidden'; // LOCK SCROLL
            sessionStorage.setItem('popupShown', 'true');
        };

        const closePopup = () => {
            popup.classList.remove('active');
            document.body.style.overflow = ''; // UNLOCK SCROLL
        }

        closePopupBtn.addEventListener('click', closePopup);

        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePopup();
            }
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
                    showPopup();
                }
            });
        }, { threshold: 0 });

        observer.observe(triggerSection);
    }


    // --- 8. Guarantee Shield Animation ---
    const shieldIcon = document.querySelector('.guarantee-badge-icon');
    if (shieldIcon) {
        const shieldObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    shieldIcon.classList.add('shield-animate');
                    shieldObserver.unobserve(entry.target); // Run once
                }
            });
        }, { threshold: 0.5 });
        shieldObserver.observe(shieldIcon);
    }

    // --- 9. Professional Checkout Logic ---
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutBtn = document.getElementById('close-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    const abandonmentModal = document.getElementById('abandonment-modal');
    const btnStay = document.getElementById('btn-stay');
    const btnLeave = document.getElementById('btn-leave');

    // --- Close Button with Abandonment Protection ---
    closeCheckoutBtn.addEventListener('click', () => {
        abandonmentModal.style.display = 'flex';
    });

    btnStay.addEventListener('click', () => {
        abandonmentModal.style.display = 'none';
    });

    btnLeave.addEventListener('click', () => {
        abandonmentModal.style.display = 'none';
        checkoutModal.classList.remove('active'); // Use checkoutModal instead of checkoutPopup
        document.body.style.overflow = ''; // Unlock scroll
    });

    // Step Sections
    const stepSections = document.querySelectorAll('.checkout-step-section');
    const steps = document.querySelectorAll('.step');
    const stepTitle = document.getElementById('step-title');
    const stepSubtitle = document.getElementById('step-subtitle');

    // Controls
    const btnNextStep = document.getElementById('btn-next-step');
    const btnPrevStep = document.getElementById('btn-prev-step');
    const btnFinalize = document.getElementById('btn-finalize');
    const btnCopyPix = document.getElementById('btn-copy-pix');

    // Inputs
    const inputCpf = document.getElementById('customer-cpf');
    const inputPhone = document.getElementById('customer-phone');
    const inputEmail = document.getElementById('customer-email');

    // Credit Card Fields
    const cardForm = document.getElementById('credit-card-form');
    const inputCardNumber = document.getElementById('card-number');
    const inputCardExpiry = document.getElementById('card-expiry');
    const inputCardCvv = document.getElementById('card-cvv');
    const inputCardName = document.getElementById('card-name');
    const selectInstallments = document.getElementById('card-installments');
    const btnScan = document.querySelector('.btn-scan');

    // Summary
    const summaryProductName = document.getElementById('checkout-product-name-summary');
    const summaryTotalPrice = document.getElementById('checkout-total-price-summary');

    let currentProduct = { id: 'combo', title: 'Protocolo Elite 360º', price: 111.84 };
    let currentStepIndex = 0;

    // --- Input Masking ---
    const maskCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskPhone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const maskCardNumber = (value) => value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    const maskExpiry = (value) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substr(0, 5);
    const maskCVV = (value) => value.replace(/\D/g, '').substr(0, 4);

    // --- Input Validation Patterns ---
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateCPF = (cpf) => cpf.replace(/\D/g, '').length === 11;
    const validatePhone = (phone) => phone.replace(/\D/g, '').length >= 10;
    const validateCardNumber = (number) => number.replace(/\D/g, '').length === 16;
    const validateExpiry = (expiry) => /^\d{2}\/\d{2}$/.test(expiry);
    const validateCVV = (cvv) => cvv.replace(/\D/g, '').length >= 3;

    const applyValidation = (input, isValid) => {
        if (!input.value) {
            input.classList.remove('is-valid', 'is-invalid');
            return;
        }
        input.classList.toggle('is-valid', isValid);
        input.classList.toggle('is-invalid', !isValid);
    };

    inputCpf.addEventListener('input', (e) => e.target.value = maskCPF(e.target.value));
    inputPhone.addEventListener('input', (e) => e.target.value = maskPhone(e.target.value));
    inputCardNumber.addEventListener('input', (e) => e.target.value = maskCardNumber(e.target.value));
    inputCardExpiry.addEventListener('input', (e) => e.target.value = maskExpiry(e.target.value));
    inputCardCvv.addEventListener('input', (e) => e.target.value = maskCVV(e.target.value));

    // Blur Listeners for Visual Feedback
    document.getElementById('customer-name').addEventListener('blur', (e) => applyValidation(e.target, e.target.value.trim().length > 3));
    inputCpf.addEventListener('blur', (e) => applyValidation(e.target, validateCPF(e.target.value)));
    inputPhone.addEventListener('blur', (e) => applyValidation(e.target, validatePhone(e.target.value)));
    inputEmail.addEventListener('blur', (e) => applyValidation(e.target, validateEmail(e.target.value)));

    inputCardNumber.addEventListener('blur', (e) => applyValidation(e.target, validateCardNumber(e.target.value)));
    inputCardName.addEventListener('blur', (e) => applyValidation(e.target, e.target.value.trim().length > 3));
    inputCardExpiry.addEventListener('blur', (e) => applyValidation(e.target, validateExpiry(e.target.value)));
    inputCardCvv.addEventListener('blur', (e) => applyValidation(e.target, validateCVV(e.target.value)));

    // --- Step Navigation ---
    const goToStep = (index) => {
        stepSections.forEach((s, i) => s.classList.toggle('active', i === index));
        steps.forEach((s, i) => {
            s.classList.toggle('active', i === index);
            s.classList.toggle('completed', i < index);
        });
        currentStepIndex = index;

        // Update titles
        if (index === 0) {
            stepTitle.textContent = "Estamos Quase Lá!";
            stepSubtitle.textContent = "Preencha seus dados para receber o acesso imediato.";
        } else if (index === 1) {
            stepTitle.textContent = "Escolha o Pagamento";
            stepSubtitle.textContent = "Selecione a melhor opção para você.";
        } else if (index === 2) {
            stepTitle.textContent = "Finalizando...";
            stepSubtitle.textContent = "Siga as instruções abaixo.";
        }
    };

    btnNextStep.addEventListener('click', () => {
        // Simple Validation for Step 1
        const name = document.getElementById('customer-name').value;
        const cpf = inputCpf.value;
        const phone = inputPhone.value;

        if (!name || cpf.length < 14 || phone.length < 14 || !inputEmail.value) {
            alert('Por favor, preencha todos os dados corretamente.');
            return;
        }

        goToStep(1);
    });

    btnPrevStep.addEventListener('click', () => goToStep(0));



    // --- Payment Method Selection ---
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input');
            radio.checked = true;

            // Toggle Card Form
            cardForm.style.display = radio.value === 'credit_card' ? 'block' : 'none';
        });
    });

    // Scanner Simulation
    btnScan.addEventListener('click', () => {
        alert('Funcionalidade de câmera iniciada. Posicione o cartão na frente da lente.');
        // In a real implementation with an SDK:
        // cardScanner.start().then(data => { ... });
    });

    // --- Open Checkout ---
    const securityOverlay = document.getElementById('security-loading');

    const openCheckout = (product) => {
        currentProduct = product;
        summaryProductName.textContent = product.title;
        summaryTotalPrice.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
        goToStep(0);

        // Show security animation for 3 seconds
        if (securityOverlay) {
            securityOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                securityOverlay.classList.remove('active');
                checkoutModal.classList.add('active');
            }, 3000);
        } else {
            // Fallback if overlay element is missing
            checkoutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeCheckout = () => {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // closeCheckoutBtn.addEventListener('click', closeCheckout); // REMOVED - Using abandonment logic instead

    // Intercept Buy Buttons
    document.querySelectorAll('a[href*="kiwify"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.price-card');
            let product = { id: 'combo', title: 'Protocolo Elite 360º', price: 111.84 };

            if (card) {
                const title = card.querySelector('.price-title')?.textContent || 'Produto';
                const priceText = card.querySelector('.price-amount')?.textContent || '0';
                const priceMatch = priceText.match(/R\$\s*([\d,.]+)/);
                const price = priceMatch ? parseFloat(priceMatch[1].replace('.', '').replace(',', '.')) : 0;
                product = { id: title.toLowerCase().replace(/ /g, '-'), title, price };
            }

            openCheckout(product);
        });
    });

    // --- Finalize Payment ---
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paymentType = document.querySelector('input[name="payment-type"]:checked').value;

        if (paymentType === 'credit_card') {
            if (inputCardNumber.value.length < 19 || inputCardExpiry.value.length < 5 || inputCardCvv.value.length < 3 || !inputCardName.value) {
                alert('Por favor, preencha os dados do cartão corretamente.');
                btnFinalize.disabled = false;
                btnFinalize.textContent = 'FINALIZAR AGORA';
                return;
            }
        }

        btnFinalize.disabled = true;
        btnFinalize.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESSANDO...';

        const formData = {
            customer: {
                name: document.getElementById('customer-name').value,
                cpf: inputCpf.value,
                phone: inputPhone.value,
                email: inputEmail.value || 'no-email@provided.com'
            },
            deliveryMethod: 'email',
            items: [currentProduct],
            paymentMethod: paymentType,
            cardData: paymentType === 'credit_card' ? {
                number: inputCardNumber.value,
                expiry: inputCardExpiry.value,
                cvv: inputCardCvv.value,
                name: inputCardName.value,
                installments: selectInstallments.value
            } : null
        };

        try {
            if (paymentType === 'pix') {
                const response = await fetch('http://localhost:3000/api/checkout/pix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();

                if (data.qr_code_base64) {
                    document.getElementById('pix-qr-img').src = `data:image/jpeg;base64,${data.qr_code_base64}`;
                    document.getElementById('pix-code-text').value = data.qr_code;
                    document.getElementById('pix-payment-area').style.display = 'block';
                    document.getElementById('success-area').style.display = 'none';
                    goToStep(2);

                    // Pix Countdown (15m)
                    let timer = 15 * 60;
                    const timerDisplay = document.getElementById('pix-countdown');
                    const interval = setInterval(() => {
                        let m = Math.floor(timer / 60);
                        let s = timer % 60;
                        timerDisplay.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
                        if (--timer < 0) clearInterval(interval);
                    }, 1000);

                } else { throw new Error('Pix Error'); }
            } else {
                // Credit Card: Create Preference and Redirect
                const response = await fetch('http://localhost:3000/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (data.init_point) {
                    window.location.href = data.init_point;
                } else { throw new Error('CC Error'); }
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao processar. Tente novamente.');
            btnFinalize.disabled = false;
            btnFinalize.textContent = 'FINALIZAR AGORA';
        }
    });

    // Copy Pix Button
    btnCopyPix.addEventListener('click', () => {
        const copyText = document.getElementById('pix-code-text');
        copyText.select();
        navigator.clipboard.writeText(copyText.value);
        btnCopyPix.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => btnCopyPix.innerHTML = '<i class="fa-solid fa-copy"></i>', 2000);
    });

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

    // B) Track "Time on Page: 8 Seconds"
    // User mentioned a specific list for "8 seconds". 
    // We send a Custom Event so they can map it.
    setTimeout(() => {
        if (typeof fbq === 'function') {
            fbq('trackCustom', 'TimeSpent_8s');
            // Also sending 'ViewContent' as a backup for engaged users
            fbq('track', 'ViewContent');
        }
    }, 8000); // 8000ms = 8 seconds

});
