const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const ABANDON_PATH = path.join(DATA_DIR, 'abandons.json');

try {
    const historyData = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    const abandonsData = JSON.parse(fs.readFileSync(ABANDON_PATH, 'utf8'));

    let changed = false;

    // Build a list of buyers emails and phones
    const buyerEmails = historyData.filter(h => h && h.email).map(h => String(h.email).toLowerCase().trim());
    const buyerPhones = historyData.filter(h => h && h.phone).map(h => String(h.phone).replace(/\D/g, ''));

    abandonsData.forEach(a => {
        if (!a.paid) {
            let aEmail = a.email ? String(a.email).toLowerCase().trim() : '';
            let aPhone = a.phone ? String(a.phone).replace(/\D/g, '') : '';

            // Se o email do abandono existir nos emails de compra, ou o telefone
            if ((aEmail && buyerEmails.includes(aEmail)) || (aPhone && buyerPhones.includes(aPhone))) {
                a.paid = true;
                a.paidAt = new Date().toISOString();
                changed = true;
                console.log(`[CLEAN_ABANDONS] Retroativamente limpo o abandono de: ${a.email || a.phone}`);
            }
        }
    });

    if (changed) {
        fs.writeFileSync(ABANDON_PATH, JSON.stringify(abandonsData, null, 4));
        console.log(`[CLEAN_ABANDONS] Arquivo abandons.json atualizado com sucesso.`);
    } else {
        console.log(`[CLEAN_ABANDONS] Nenhum abandono precisava de correção.`);
    }

} catch (e) {
    console.error(`[CLEAN_ABANDONS] Erro:`, e.message);
}
