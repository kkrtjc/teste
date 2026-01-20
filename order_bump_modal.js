// Order Bump Modal Logic
let orderBumpShown = false;
let orderBumpAccepted = false;

// Show modal when user clicks on first input field
document.addEventListener('click', function (e) {
    const emailInput = document.getElementById('payer-email');
    if (e.target === emailInput && !orderBumpShown) {
        showOrderBumpModal();
    }
}, true);

function showOrderBumpModal() {
    const modal = document.getElementById('order-bump-modal');
    if (modal && !orderBumpShown) {
        modal.classList.add('show');
        orderBumpShown = true;
    }
}

function closeOrderBumpModal() {
    const modal = document.getElementById('order-bump-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function acceptOrderBump() {
    // Add the order bump to cart
    const bumpId = 'bump-6361'; // ID do order bump da tabela de ração

    if (!cart.bumps.includes(bumpId)) {
        cart.bumps.push(bumpId);
        orderBumpAccepted = true;
        updateTotal();
    }

    closeOrderBumpModal();

    // Show success feedback
    const emailInput = document.getElementById('payer-email');
    if (emailInput) {
        const feedback = document.createElement('div');
        feedback.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--color-secondary); color: #000; padding: 1rem 2rem; border-radius: 10px; font-weight: 700; z-index: 10002; animation: slideDown 0.3s ease;';
        feedback.innerHTML = '<i class="fa-solid fa-check"></i> Tabela de Ração adicionada!';
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }
}
