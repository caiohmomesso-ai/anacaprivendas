#!/usr/bin/env python3
"""Monta a demonstracao.html a partir do index.html.

A demonstração é o sistema inteiro com o banco trocado por um falso, que
vive na memória do navegador. Antes isso era feito na mão e os dois arquivos
viviam divergindo — bastava eu corrigir o index e esquecer a demo. Agora a
demo é gerada, e o index é a única fonte.

Os pedaços que são só da demonstração ficam em moldes/:
  estilo.css   a faixa roxa do topo
  login.html   a tela de escolha de perfil, no lugar do login de verdade
  fakedb.js    o banco falso e os dados de exemplo
  banner.js    a faixa e o botão de trocar de perfil

    python3 gerar-demo.py
"""
import re, sys, pathlib

AQUI = pathlib.Path(__file__).parent
MOLDES = AQUI / 'moldes'

def ler(nome):
    p = MOLDES / nome
    if not p.exists():
        sys.exit('falta o molde ' + str(p))
    return p.read_text(encoding='utf-8')

def main():
    idx = (AQUI / 'index.html').read_text(encoding='utf-8')

    # 1. o estilo da demo entra junto com o do sistema
    idx = idx.replace('</style>', ler('estilo.css').rstrip() + '\n</style>', 1)

    # 2. a tela de login de verdade sai; entram os perfis
    login = re.search(r'<div id="login">.*?</div></div>', idx, re.S)
    if not login:
        sys.exit('não achei a tela de login no index.html')
    idx = idx.replace(login.group(0), ler('login.html').rstrip(), 1)

    # 3. a biblioteca do Supabase sai; entra o banco falso
    cdn = re.search(r'<script src="https://cdn\.jsdelivr\.net[^>]*></script>\n?', idx)
    if not cdn:
        sys.exit('não achei a tag do Supabase no index.html')
    idx = idx.replace(cdn.group(0), '<script>\n' + ler('fakedb.js').strip() + '\n</script>\n', 1)

    # 4. a faixa de demonstração, depois de tudo
    idx = idx.rstrip()
    assert idx.endswith('</html>'), 'o index não termina em </html>'
    idx = idx[:-len('</html>')] + '<script>\n' + ler('banner.js').strip() + '\n</script>\n</html>\n'

    (AQUI / 'demonstracao.html').write_text(idx, encoding='utf-8')
    print('demonstracao.html gerada —', len(idx), 'bytes')

if __name__ == '__main__':
    main()
