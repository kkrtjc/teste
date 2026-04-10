#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrai o texto de ebook_doencas.pdf (original) → ebook_text.txt
Usado pelo build_html_ebook.py. Instale: pip install pymupdf
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_TXT = os.path.join(SCRIPT_DIR, 'ebook_text.txt')


def resolve_pdf_path():
    env = os.environ.get('EBOOK_DOENCAS_PDF', '').strip()
    candidates = [
        env if env else None,
        os.path.join(REPO_ROOT, 'ebook_doencas.pdf'),
        os.path.join(SCRIPT_DIR, 'ebook_doencas.pdf'),
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            return os.path.normpath(p)
    return None


def main():
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print('Instale PyMuPDF: pip install pymupdf', file=sys.stderr)
        sys.exit(1)

    pdf = resolve_pdf_path()
    if not pdf:
        print(
            'Arquivo ebook_doencas.pdf não encontrado.\n'
            'Coloque em: ' + os.path.join(REPO_ROOT, 'ebook_doencas.pdf') + '\n'
            'Ou defina a variável de ambiente EBOOK_DOENCAS_PDF com o caminho completo.',
            file=sys.stderr,
        )
        sys.exit(1)

    doc = fitz.open(pdf)
    parts = []
    for i in range(len(doc)):
        page = doc.load_page(i)
        parts.append('--- PAGE %d ---' % i)
        parts.append(page.get_text())
        parts.append('')

    text = '\n'.join(parts)
    with open(OUT_TXT, 'w', encoding='utf-8') as f:
        f.write(text)

    print('[OK] PDF:', pdf)
    print('[OK] Gerado:', OUT_TXT)
    print('     Páginas:', len(doc), '| caracteres:', len(text))
    doc.close()


if __name__ == '__main__':
    main()
