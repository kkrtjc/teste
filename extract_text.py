#!/usr/bin/env python3
"""Redireciona para o extrator oficial (ebook_doencas.pdf → pdfs_secure_12x9a/ebook_text.txt)."""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
script = os.path.join(ROOT, 'pdfs_secure_12x9a', 'extract_ebook_from_pdf.py')
sys.exit(subprocess.call([sys.executable, script]))
