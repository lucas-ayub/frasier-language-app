# Frasier — idiomas com frases

App web (PWA) no estilo Clozemaster: você aprende um idioma completando frases reais.

- **Espanhol:** 131 mil frases do [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR), ordenadas pela frequência da palavra escondida
- Múltipla escolha, digitação com dicas letra por letra e resposta falada
- Revisão espaçada (0–100%), meta diária e sequência de dias
- Funciona offline e pode ser instalado na tela de início do iPhone (Safari › Compartilhar › Adicionar à Tela de Início)

## Adicionar um idioma

1. Gere os arquivos em `data/<código>/` (`index.json`, `words.json`, `c0.json`, `c1.json`…) com o mesmo formato dos de `data/es/`.
2. Acrescente uma entrada em `COURSES` no `index.html`.

Frases e traduções: Tatoeba.org, licença CC BY 2.0 FR. Cada frase tem um link para a original.
