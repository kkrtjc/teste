#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte ebook_text.txt (extraído do ebook_doencas.pdf) em diseases.json para o PWA.
Saída padrão: ../client/public/diseases.json e ../client/public/version.json
"""
import json
import os
import re
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
INPUT_TXT = os.path.join(SCRIPT_DIR, "ebook_text.txt")
OUT_DISEASES = os.path.join(REPO_ROOT, "client", "public", "diseases.json")
OUT_VERSION = os.path.join(REPO_ROOT, "client", "public", "version.json")

DISEASE_PREFIXES = [
    'Bronquite Infecciosa',
    'Laringotraqueíte Infecciosa',
    'Metapneumovirose Aviária',
    'Micoplasmose Respiratória',
    'Coriza Infecciosa',
    'Ornithobacterium rhinotracheale',
    'Ornithobacterium (ORT)',
    'Doença de Newcastle',
    'Doença de Marek',
    'Doença de Gumboro',
    'Influenza Aviária',
    'Varíola Aviária',
    'Salmonelose',
    'Cólera Aviária',
    'Colibacilose',
    'Enterite Necrótica',
    'Coccidiose',
    'Verminoses',
    'Histomoníase',
    'Tricomoníase',
    'Criptosporidiose',
    'Deficiência de Cálcio',
    'Deficiências Vitamínicas',
    'Retenção de Ovo',
    'Ferimentos, Bicagem e Canibalismo',
    'Ectoparasitoses',
    'Peito seco',
    'Principais Problemas',
]

SECTION_MARKERS = [
    ('Doenças Respiratórias', 'respiratorias'),
    ('Doenças Virais Sistêmicas', 'virais'),
    ('Doenças Bacterianas Sistêmicas / Entéricas', 'bacterianas'),
    ('Doenças Bacterianas Sistêmicas', 'bacterianas'),
    ('Doenças Parasitárias / Protozoárias / Intestinais', 'parasitas'),
    ('Doenças Parasitárias', 'parasitas'),
    ('Condições Nutricionais e Problemas Comuns', 'nutricionais'),
    ('Tabela de Sintomas x Doenças Prováveis', 'capitulo-2'),
    ('CAPÍTULO 2', 'capitulo-2'),
    ('Calendário de Vacinação', 'vacinacao'),
    ('Checklist de Manejo Diário', 'checklist'),
    ('Protocolos de Vermifugação', 'vermifugacao'),
]


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9\\s-]', '', s, flags=re.I)
    s = re.sub(r'\\s+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s[:80] or 'item'


def is_disease_title(line: str) -> bool:
    clean = line.strip().lstrip('\u200b \t')
    if not clean or len(clean) > 90:
        return False
    if clean.endswith(':') or clean.endswith(','):
        return False
    for dp in DISEASE_PREFIXES:
        if clean.startswith(dp):
            return True
    return False


def field_kind(text: str):
    t = text.strip()
    if t.startswith('Sintomas:') or t.startswith('Sintoma(s)'):
        return 'sintomas'
    if t.startswith('Prevenção:'):
        return 'prevencao'
    if t.startswith('Tratamento'):
        return 'tratamento'
    if t.startswith('Antibióticos:'):
        return 'antibioticos'
    if t.startswith('Anticoccidianos:'):
        return 'anticoccidianos'
    if t.startswith('Vermífugos:'):
        return 'vermifugos'
    if t.startswith('Medicamentos:'):
        return 'medicamentos'
    if t.startswith('Produtos para Aves:'):
        return 'produtos_aves'
    if t.startswith('Produtos para Ambiente:'):
        return 'produtos_ambiente'
    if t.startswith('Suporte:'):
        return 'suporte'
    if t.startswith('Suplementação:'):
        return 'suplementacao'
    if t.startswith('Primeiros Socorros:'):
        return 'primeiros_socorros'
    if t.startswith('Aviso:'):
        return 'aviso'
    return None


def strip_prefix(text: str) -> str:
    if ':' in text:
        return text.split(':', 1)[1].strip()
    return text.strip()


def load_lines():
    if not os.path.isfile(INPUT_TXT):
        raise SystemExit("ebook_text.txt não encontrado. Rode extract_ebook_from_pdf.py primeiro.")
    raw = open(INPUT_TXT, 'r', encoding='utf-8').read().splitlines()
    cleaned = []
    for line in raw:
        s = line.strip()
        if not s:
            continue
        if s.startswith('--- PAGE'):
            continue
        if s in ('GALOS MURA', 'BRASIL', 'Sumário'):
            continue
        if re.match(r'^\\d{1,2}$', s):
            continue
        cleaned.append(s.lstrip('\u200b \t'))
    return cleaned


def merge_paragraphs(lines):
    starts = (
        'Sintomas:', 'Sintoma(s)', 'Prevenção:', 'Tratamento', 'Antibióticos:',
        'Anticoccidianos:', 'Vermífugos:', 'Medicamentos:', 'Produtos para',
        'Primeiros Socorros:', 'Lesões ', 'Suporte:', 'Suplementação:', 'Lubrificação',
        'Aviso:', 'Causas:', 'Identificação', 'Isolamento', 'Vitamina ',
        'CAPÍTULO', 'Capítulo', 'CONCLUSÃO', 'GUIAS', 'Calendário', 'Protocolos',
        'Checklist', 'Nota:', 'Aves Jovens', 'Aves Adultas', 'Rotação',
        'Período de Carência', 'Manhã:', 'Tarde:', 'Final do Dia:', '[ ]'
    )
    merged = []
    buf = ''
    for line in lines:
        is_start = any(line.startswith(s) for s in starts) or is_disease_title(line) or any(m in line for m, _ in SECTION_MARKERS)
        if buf and is_start:
            merged.append(buf.strip())
            buf = line
        else:
            buf = (buf + ' ' + line) if buf else line
    if buf.strip():
        merged.append(buf.strip())
    return merged


def build():
    lines = load_lines()
    merged = merge_paragraphs(lines)

    section = 'inicio'
    diseases = []
    current = None

    def close_current():
        nonlocal current
        if current:
            diseases.append(current)
        current = None

    for p in merged:
        # section marker
        for marker, sid in SECTION_MARKERS:
            if marker in p:
                close_current()
                section = sid
                break

        if is_disease_title(p) and section not in ('capitulo-2', 'vacinacao', 'checklist'):
            close_current()
            name = p.strip()
            current = {
                "id": slugify(name),
                "nome": name,
                "fields": [],
                "section": section,
                "tags": [section],
            }
            continue

        kind = field_kind(p)
        if kind and current:
            current["fields"].append({"kind": kind, "text": strip_prefix(p)})
        else:
            # generic text
            if current:
                current["fields"].append({"kind": "intro", "text": p.strip()})

    close_current()

    versao = "1.0.0"
    out = {
        "versao": versao,
        "totalDoencas": len(diseases),
        "diseases": diseases,
    }
    os.makedirs(os.path.dirname(OUT_DISEASES), exist_ok=True)
    with open(OUT_DISEASES, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    now = datetime.now(timezone.utc).isoformat()
    with open(OUT_VERSION, 'w', encoding='utf-8') as f:
        json.dump({"versao": versao, "dataAtualizacao": now, "totalDoencas": len(diseases), "idioma": "pt-BR"}, f, ensure_ascii=False, indent=2)

    print("[OK] diseases.json:", OUT_DISEASES)
    print("[OK] version.json:", OUT_VERSION)
    print("     total:", len(diseases))


if __name__ == "__main__":
    build()

