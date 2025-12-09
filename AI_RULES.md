O contexto completo do meu projeto atual, a estrutura de pastas e arquivos atual se encontram no arquivo repomix_output.xml.

CONTEXTO TÉCNICO:
Este é um projeto React + Vite complexo e modular, com
múltiplas dependências e arquivos.

*SUAS INSTRUÇÕES OBRIGATÓRIAS (LEIA COM ATENÇÃO):*
 
MODO ARQUITETO: Aja como um Arquiteto de Software Sênior. Foque na estrutura e integridade.

PROIBIDO GERAR PRÉVIA: Não tente gerar uma visualização executável (Preview) do app inteiro.
SAÍDA EM BLOCOS: Forneça o código em blocos separados para cada arquivo modificado/criado.
CAMINHOS EXPLÍCITOS: Indique o caminho exato (ex:
src/modules/...) no topo de cada bloco.

** PROTOCOLO DE SEGURANÇA:**
1.  CONFIRMAÇÃO DE ESTRUTURA: Antes de gerar qualquer código, analise a árvore de pastas enviada e confirme o entendimento da estrutura atual.
2.  SOLICITAÇÃO DE ARQUIVOS: Se precisar alterar um
arquivo existente, NÃO O REESCREVA DE CABEÇA. Pare e me peça: "Por favor, envie o conteúdo atual do arquivo X para que eu possa edita-lo."
3.  DEPENDÊNCIAS CRUZADAS: Se a sua alteração impactar outros arquivos (ex: mudar uma prop num componente pai que quebra o filho), ME AVISE e solicite os arquivos impactados antes de prosseguir.
4. NUNCA REDIJA CÓDIGOS NO CANVAS QUE HABILITEM O PREVIEW. Isso faz gerar dependencias que não existem e vc começa a procurar por erros que nao deveria acontecer. ESTOU RODANDO LOCALMENTE NA MINHA MAQUINA. Entao nao se preocupe pois EU NAO QUERO VER PREVIEW DO CÓDIGO, EU SÓ COPIO E COLO NO MEU COMPUTADOR
 
*RESUMO DO APP:*
- Aplicativo para controle financeiro, com 2 modos. Modo
pessoal (para finanças pessoais) e modo empresarial (para controle financeiro de empresa, tributos e notas fiscais).
- MODO PESSOAL JÁ ESTÁ DEFINIDO, NÃO DEVE MEXER NESTE MODO E SEUS ARQUIVOS
- MODO EMPRESARIAL SERÁ ONDE FAREMOS O DESENVOLVIMENTO SEGUINDO AS REGRAS E ORDENS A SEGUIR:
 
*REGRAS E ORDENS DOS PAINÉIS EMPRESARIAL:*

1. CRM (Business Cliente): 
    - Fazemos o controle de clientes, projetos, serviços, adicionando, editando, deletando ou arquivando. 
    - São mostrados Cards do cliente com as principais informações do cliente, como CNPJ e volume financeiro de projetos. 
    - O card do cliente possui um botão de edição (abre uma janela para configurar os dados do cliente como apelido, razão social, cnpj, endereço)
    - Ao clicar no card do cliente abre um painel com a lista de cards de projetos para criação, edição, arquivamento e remoção de projetos.
    - Esses projetos são mostrados em cards, que ao clicar você abre um painel com as informações do projeto, podendo colocar uma descrição, anexar um arquivo PDF da proposta, adicionar, editar, arquivar e deletar serviços(cada serviços tem um valor, que determina o preço do projeto. Este valor é o valor líquido). 
    - O preço do projeto é determinado pela incidência de 20% (ou uma taxa editável no painel (fórmula do preço do projeto = somatório dos serviços / 1-taxa).
    - O painel CRM é visto em 3 colunas. Primeira coluna mostra os cards dos clientes. Segunda coluna mostra os cards dos projetos. Terceira coluna mostra as informações dos projetos e composição e edição dos serviços e preços.
    - O painel CRM tem um visual dinâmico, clicando em um card pra primeira coluna, abre a segunda coluna. Ao clicar em um card da segunda coluna, abre a terceira coluna. Primeira e segunda coluna possuem um botão de esconder a coluna.
2. FLUXO DE CAIXA (Business Accounting):
	- Painel de livro razão contábil
	- Registro de todas transações bancárias
	- controle de contas correntes
	- controle de contas de aplicação 
	- controle de fluxo de caixa
	- previsibilidade de contas a pagar, receber, em dia, programado, atrasado
	- registro de transações previstas
	- comparativo de previsto e realizado
	- vinculação de transações para sócios (dividendos) e colaboradores (pagamentos)
	- configuração de criação, edição e remoção de categorias de transações
	- controle de cartão de crédito
	- dashboard completo com:
		- gráfico de despesas e receitas mensais
		- gráfico de saldo acumulado previsto e realizado
		- visualização do saldo existente na conta corrente e conta de aplicação
		- relação de pagamento para colaboradores e sócios
3. NOTAS FISCAIS (Business Invoices): 
    - Criamos notas, damos um número, editamos a data de emissão, código do serviço, dizemos se há retenção de impostos, inserimos uma descrição, geramos um texto composto para copiar e incluir na nota fiscal, visualizamos o arquivo em forma impressa com os logos da prefeitura e empresa. Este painel já está feito e configurado. NÃO MODIFICAR ESTE PAINEL.
    - Este painel armazena todas informações de faturamento e retenções necessárias para o painel tributário.
4. TRIBUTÁRIO (BusinessTaxes): 
    - Deve ter 5 cards dispostos um ao lado do outro no topo da página. Um card para cada tributo. 
    - Cada card apresenta o total de cada tributo computado (os tributos que podem ser retidos mostram o valor na íntegra. As retenções funcionarão como créditos e abatidos no pagamento)
    - Ao clicar em cada card sera mostrado abaixo o extrato daquele tributo selecionado
    - O extrato de cada tributo deve conter as seguintes colunas: mês inc., data de vencimento, (≈) A Pagar, (=) Pago, Multa/Ajuste:
        - Mês Inc.: o mês de apuração das notas
        - Data de Vencimento: mês que vence o pagamento do tributo
        - (≈) A Pagar: apuração calculada pelo aplicativo em cima das notas lançadas no painel de notas fiscais (considera créditos de PIS e COFINS)
        - (=) Pago: o usuário imputa o valor efetivamente pago, exato, com multa ou com ajustes de casa decimal
        - Multa/Ajuste: diferença entre o A Pagar e Pago, sendo vermelho se pagar a mais ou verde se pagar a menos
    - Devemos ter um botão de Dashboard que aparece somente quando não está selecionado um card dos tributos, mostrando os gráfica no local onde estariam os extratos. O Dashboard deve conter os seguintes gráficos:
        -  um gráfico de barras com o eixo x tendo os meses e o eixo y tendo os valores apurados. Cada mês vai ter 5 barras para mostrar cada tributo apurado aquele mês. 
        - Um gráfico de linha mostrando os tributos apurados acumulados. Cada linha representa um tributo, tendo uma linha totalizadora com a soma dos tributos.
5. PROFISSIONAIS (Business Partners):
	- Gestão de usuarios da empresa
	- Gestão de papeis: socio administrador, socio ou colaborador
6. DADOS DA EMPRESA (Business Settings): 
    - Editamos os dados da empresa que são refletidos nas notas fiscais, como razão social, cnpj, contatos, endereço, códigos de serviços (registramos e catalogamos esses códigos), logo da empresa e logo da prefeitura.
    - Deve ter um botão para carregar uma imagem do logo da empresa (esta imagem sai na nota fiscal gerada e aparece no painel do modo empresa)
        - Deve ter um botão para carregar uma imagem do brasão da prefeitura (esta imagem sai na nota fiscal gerada)

** LÓGICA DOS TRIBUTOS:**

CÁLCULO SOBRE O FATURAMENTO:
Tributos Municipais Incidentes:
ISS = 5,00% (Cliente não retém)

Tributos Federais:
PIS = 0,65% (Cliente pode reter 0,65%. Se retido, sobra 0% para eu pagar de PIS)
COFINS = 3,00% (Cliente pode reter 3,00%. Se retido, sobra 0% para eu pagar de COFINS)
IRPJ = 4,80% (Cliente pode reter 1,50% em IRPF. Se retido, sobra 3,30% para eu pagar de IRPJ)
CSLL = 2,88% (Cliente pode reter 1,00%. Se retido, sobra 1,88% para eu pagar de CSLL)

DATAS DE VENCIMENTO:
Tributos Municipais Incidentes:
ISS = dia 10 do próximo mês de incidência 

Tributos Federais:
PIS = dia 10 do próximo mês de incidência 
COFINS = dia 10 do próximo mês de incidência 
IRPJ = último dia do próximo mês do trimestre incidente
CSLL = último dia do próximo mês do trimestre incidente

EXEMPLO DE FATURAMENTO SEM RETENÇÃO:

NFSe = 1.000,00

TRIBUTOS A SEREM PAGOS POR MIM:
ISS:  0,05 x NFSe  = 50
PIS: 0,0065 x NFSe  = 6,5
COFINS: 0,03 x NFSe  = 30
IRPJ: 0,048 x NFSe  = 48
CSLL: 0,0288 x NFSe  = 28,8

EXEMPLO DE FATURAMENTO COM RETENÇÃO:

TRIBUTOS A SEREM PAGOS POR MIM:
ISS:  0,05 x NFSe  = 50
PIS: 0,00 x NFSe  = 0
COFINS: 0,00 x NFSe  = 0
IRPJ: 0,0330 x NFSe  = 33
CSLL: 0,0188 x NFSe  = 18,8

TRIBUTOS RETIDOS NA FONTE:
PIS: 0,0065 x NFSe  = 6,5
COFINS: 0,03 x NFSe  = 30
IRPJ: 0,0150 x NFSe  = 15
CSLL: 0,0100 x NFSe  = 10

TRIBUTO SOBRE LUCRO EXCEDENTE:
A empresa trabalha sobre lucro presumido de 32%. Caso no trimestre tenha um lucro excedente a 60.000,00, será acrescido ao IRPJ um valor de 10% sobre o excedente do lucro. Por exemplo:

Faturamento (no trimestre) = 200.000,00
Lucro (presunção de 32%) = 64.000,00
Excedente = 4.000,00
IRPJ+= 10% x 4.000,00 = 400 (Valor a lançar a mais no IRPJ do trimestre apurado)