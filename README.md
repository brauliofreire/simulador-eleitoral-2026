# Simulador Eleitoral 2026

Simulador web estático de cenários hipotéticos de transferência de votos, com gráficos, ajustes de percentuais, abstenções e exportação CSV.

## Uso
Abra `index.html` em um navegador. O projeto não necessita de backend ou dependências.

## Dados e limites
Os números iniciais foram adotados na conversa de concepção e ainda **não foram verificados em fonte oficial**. Conferir antes de qualquer publicação. O simulador não é pesquisa eleitoral nem previsão.

## Privacidade e publicação
Sem coleta de dados pessoais. Repositório público e publicação no GitHub Pages autorizados pelo proprietário em 08/10/2026.

Acesse: [https://brauliofreire.github.io/simulador-eleitoral-2026/](https://brauliofreire.github.io/simulador-eleitoral-2026/). A publicação usa a raiz da branch `main`, com HTTPS; novos pushes nessa branch atualizam o site. Os dados de entrada de 2026 continuam pendentes de conferência oficial.

## Interface e validação local
O resultado simulado do **2º turno** permanece acima das seis abas. A visão geral mostra a composição de votos por candidato; abstenções, nulos e brancos compartilham uma aba. A comparação histórica e as fontes têm abas próprias. O eleito é identificado **somente no cenário simulado**, com foto local, ou como empate.

A memória de cálculo e o CSV incluem percentuais por origem. Os percentuais de retorno se aplicam aos ausentes que retornam, cuja base é exibida separadamente. Os votos inteiros são distribuídos pelo método dos maiores restos: primeiro as partes inteiras, depois os votos restantes pelas maiores frações (empates seguem a ordem Lula, Flávio, restante). Isso evita saldos negativos por arredondamento.

O cálculo está separado em `model.js`. Para verificar conservação de votos e cenários extremos, execute `node tests/model.test.cjs`. A interface usa controles persistentes durante os ajustes, navegação por teclado e layout adaptado a telas menores. A interface foi inspecionada no Chrome em desktop e em emulação de celular (440 × 956), incluindo as seis abas, retorno integral, troca de vencedor/foto, restauração e geração do CSV. A validação em celulares reais e outros navegadores continua pendente.

As referências do TSE estão na aba **Fontes dos dados**. A referência de 2022 foi conferida; os valores iniciais de 2026 continuam pendentes de conferência. Fotos e créditos estão nessa mesma aba. Esta atualização ainda não implementa a PWA.

## Cenários rápidos
- **Situação 1º Turno:** zera todas as transferências e o retorno dos ausentes, mantendo os votos próprios. As sobras continuam seguindo o modelo de segundo turno (outros candidatos → abstenção; brancos/nulos → inválidos); não é uma totalização completa do primeiro turno.
- **Vitória Flávio / Vitória Lula:** parte do cenário atual, fixa o retorno dos ausentes em 10% e normaliza cada parcela (Lula, Flávio e restante) para pelo menos 2% e no máximo 98%. Como as três parcelas somam 100%, o teto efetivo de uma delas é 96%. Aumenta as transferências para o escolhido em passos de 1 ponto percentual até obter vantagem estrita. Cada clique altera o cenário, mesmo se o escolhido já vence. No teto, reduz um ponto em uma origem que permita manter a vitória. O método não promete a menor alteração global possível. Esses limites se aplicam aos cenários de vitória; Situação 1º Turno continua zerando as transferências e o retorno.
