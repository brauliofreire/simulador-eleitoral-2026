# Simulador Eleitoral 2026

Simulador web estático de cenários hipotéticos de transferência de votos, com gráficos, ajustes de percentuais, abstenções e exportação CSV.

## Uso
Abra `index.html` em um navegador. O projeto não necessita de backend ou dependências.

## Dados e limites
Os números iniciais foram adotados na conversa de concepção e ainda **não foram verificados em fonte oficial**. Conferir antes de qualquer publicação. O simulador não é pesquisa eleitoral nem previsão.

## Privacidade e publicação
Sem coleta de dados pessoais. Repositório privado e GitHub Pages não ativado nesta fase. Publicar somente após aprovação explícita.

## Interface e validação local
O resultado simulado do **2º turno** permanece acima das seis abas. A visão geral mostra a composição de votos por candidato; abstenções, nulos e brancos compartilham uma aba. A comparação histórica e as fontes têm abas próprias. O eleito é identificado **somente no cenário simulado**, com foto local, ou como empate.

A memória de cálculo e o CSV incluem percentuais por origem. Os percentuais de retorno se aplicam aos ausentes que retornam, cuja base é exibida separadamente. Os votos inteiros são distribuídos pelo método dos maiores restos: primeiro as partes inteiras, depois os votos restantes pelas maiores frações (empates seguem a ordem Lula, Flávio, restante). Isso evita saldos negativos por arredondamento.

O cálculo está separado em `model.js`. Para verificar conservação de votos e cenários extremos, execute `node tests/model.test.cjs`. A interface usa controles persistentes durante os ajustes, navegação por teclado e layout adaptado a telas menores. A interface foi inspecionada no Chrome em desktop e em emulação de celular (440 × 956), incluindo as seis abas, retorno integral, troca de vencedor/foto, restauração e geração do CSV. A validação em celulares reais e outros navegadores continua pendente.

As referências do TSE estão na aba **Fontes dos dados**. A referência de 2022 foi conferida; os valores iniciais de 2026 continuam pendentes de conferência. Fotos e créditos estão nessa mesma aba. Esta atualização ainda não implementa a PWA.
