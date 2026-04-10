#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte o HTML premium gerado do ebook_doencas.pdf em diseases.json para o PWA.
Preserva introdução, doenças e guias (tabela de vacinação/vermifugação etc).
"""
import json
import os
import re
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
INPUT_HTML = os.path.join(SCRIPT_DIR, "ebook_doencas_premium.html")
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


def html_to_text(html):
    txt = re.sub(r'<br\\s*/?>', '\n', html, flags=re.I)
    txt = re.sub(r'</(p|h1|h2|h3|h4|li|summary|details|div)>', '\n', txt, flags=re.I)
    txt = re.sub(r'<[^>]+>', ' ', txt)
    txt = re.sub(r'\\s+\\n', '\n', txt)
    txt = re.sub(r'\\n{3,}', '\n\n', txt)
    txt = re.sub(r'[ \\t]{2,}', ' ', txt)
    return txt.strip()


def extract_section_blocks(html):
    ids = [
        'inicio', 'capitulo-1', 'respiratorias', 'virais', 'bacterianas',
        'parasitas', 'nutricionais', 'capitulo-2', 'checklist',
        'vacinacao', 'vermifugacao', 'conclusao'
    ]
    points = []
    for sid in ids:
        marker = f'<div id="{sid}" class="section-content'
        i = html.find(marker)
        if i >= 0:
            points.append((sid, i))
    points.sort(key=lambda x: x[1])
    blocks = {}
    for idx, (sid, start) in enumerate(points):
        end = points[idx + 1][1] if idx + 1 < len(points) else len(html)
        blocks[sid] = html[start:end]
    return blocks


def map_categoria(section_id, nome):
    if section_id == 'virais':
        return 'Doenças virais'
    if section_id == 'bacterianas':
        return 'Doenças bacterianas sistemicas'
    if section_id == 'respiratorias':
        return 'Doenças bacterianas respiratorias'
    if section_id == 'nutricionais':
        if any(x in nome.lower() for x in ['peito seco', 'retenção de ovo', 'ferimentos']):
            return 'Casos isolados'
        return 'Problemas de nutrição'
    if section_id in ('parasitas',):
        return 'Casos isolados'
    return 'Casos isolados'


def build():
    if not os.path.isfile(INPUT_HTML):
        raise SystemExit("ebook_doencas_premium.html não encontrado. Rode build_html_ebook.py primeiro.")
    html = open(INPUT_HTML, 'r', encoding='utf-8').read()
    blocks = extract_section_blocks(html)

    diseases = []
    for sid in ('respiratorias', 'virais', 'bacterianas', 'parasitas', 'nutricionais'):
        block = blocks.get(sid, '')
        for m in re.finditer(
            r'<details class="disease-card">\\s*<summary>(.*?)</summary>(.*?)</details>',
            block,
            flags=re.S,
        ):
            nome = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            tail = m.group(2)
            dm = re.search(r'<div class="disease-content">(.*)</div>\\s*$', tail, flags=re.S)
            body_html = (dm.group(1) if dm else tail).strip()
            body_text = html_to_text(body_html)
            diseases.append({
                "id": slugify(nome),
                "nome": nome,
                "categoria": map_categoria(sid, nome),
                "section": sid,
                "resumo": body_text[:280],
                "html": body_html,
                "texto": body_text,
                "tags": [sid, map_categoria(sid, nome)],
            })

    intro_text = html_to_text(blocks.get('inicio', ''))
    guides = []
    guide_titles = {
        'capitulo-2': 'Tabela de Sintomas x Doenças',
        'checklist': 'Checklist de Manejo Diário',
        'vacinacao': 'Tabela de Vacinação',
        'vermifugacao': 'Tabela de Vermifugação',
        'conclusao': 'Conclusão e Recomendações',
    }
    for gid in ('capitulo-2', 'checklist', 'vacinacao', 'vermifugacao', 'conclusao'):
        if gid in blocks:
            guides.append({
                "id": gid,
                "titulo": guide_titles[gid],
                "html": blocks[gid],
                "texto": html_to_text(blocks[gid]),
            })

    versao = "1.0.0"
    out = {
        "versao": versao,
        "totalDoencas": len(diseases),
        "coverImage": "/cover-ebook.png",
        "intro": intro_text,
        "guides": guides,
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

