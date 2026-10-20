export type GlossaryGroup = 'Atos normativos' | 'Pessoal' | 'Licitações e contratos' | 'Publicação' | 'Siglas'

export interface GlossaryEntry {
  term: string
  group: GlossaryGroup
  definition: string
  source?: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Lei ordinária',
    group: 'Atos normativos',
    definition: 'Norma aprovada pelo Congresso Nacional por maioria simples e sancionada pelo Presidente da República. É o tipo de lei mais comum.',
    source: 'Constituição Federal, art. 47',
  },
  {
    term: 'Lei complementar',
    group: 'Atos normativos',
    definition: 'Lei exigida pela Constituição para matérias específicas. Precisa de maioria absoluta para ser aprovada.',
    source: 'Constituição Federal, art. 69',
  },
  {
    term: 'Medida provisória (MP)',
    group: 'Atos normativos',
    definition: 'Ato do Presidente da República com força de lei, para casos de relevância e urgência. Vale por 60 dias, prorrogáveis uma vez por igual período; se não for convertida em lei pelo Congresso, perde a eficácia.',
    source: 'Constituição Federal, art. 62, §§ 3º e 7º',
  },
  {
    term: 'Decreto',
    group: 'Atos normativos',
    definition: 'Ato do Presidente da República. O decreto regulamentar detalha como uma lei será executada e não pode contrariá-la.',
    source: 'Constituição Federal, art. 84, IV',
  },
  {
    term: 'Portaria',
    group: 'Atos normativos',
    definition: 'Ato de ministro ou dirigente de órgão. Organiza o funcionamento interno, disciplina procedimentos ou designa servidores.',
  },
  {
    term: 'Resolução',
    group: 'Atos normativos',
    definition: 'Ato de órgão colegiado (conselho, agência, comitê) que fixa regras dentro da competência desse órgão.',
  },
  {
    term: 'Instrução normativa (IN)',
    group: 'Atos normativos',
    definition: 'Ato que orienta como aplicar uma lei ou decreto, com detalhes operacionais. Muito usada pela Receita Federal e por órgãos de controle.',
  },
  {
    term: 'Vacatio legis',
    group: 'Atos normativos',
    definition: 'Período entre a publicação da lei e o início da vigência. Se a lei não disser quando entra em vigor, são 45 dias após a publicação.',
    source: 'LINDB (Decreto-Lei 4.657/1942), art. 1º',
  },
  {
    term: 'Revogação',
    group: 'Atos normativos',
    definition: 'Retirada de uma norma do ordenamento por outra norma. Pode ser total (ab-rogação) ou parcial (derrogação).',
  },
  {
    term: 'Nomeação',
    group: 'Pessoal',
    definition: 'Ato que designa alguém para um cargo público. Para o aprovado em concurso, a publicação da nomeação abre o prazo de posse.',
    source: 'Lei 8.112/1990, art. 9º',
  },
  {
    term: 'Posse',
    group: 'Pessoal',
    definition: 'Assinatura do termo que investe a pessoa no cargo. Deve ocorrer em até 30 dias da publicação da nomeação, ou a nomeação fica sem efeito.',
    source: 'Lei 8.112/1990, art. 13, §§ 1º e 6º',
  },
  {
    term: 'Exercício',
    group: 'Pessoal',
    definition: 'Início efetivo das atribuições do cargo. O prazo é de 15 dias contados da posse.',
    source: 'Lei 8.112/1990, art. 15, § 1º',
  },
  {
    term: 'Exoneração',
    group: 'Pessoal',
    definition: 'Desligamento do cargo sem caráter de punição, a pedido do servidor ou de ofício (por exemplo, em cargo em comissão).',
    source: 'Lei 8.112/1990, arts. 34 e 35',
  },
  {
    term: 'Demissão',
    group: 'Pessoal',
    definition: 'Penalidade disciplinar que desliga o servidor, aplicada após processo administrativo nas hipóteses previstas em lei. Não confundir com exoneração.',
    source: 'Lei 8.112/1990, arts. 127 e 132',
  },
  {
    term: 'Redistribuição',
    group: 'Pessoal',
    definition: 'Deslocamento de um cargo efetivo, ocupado ou vago, para outro órgão ou entidade do mesmo Poder.',
    source: 'Lei 8.112/1990, art. 37',
  },
  {
    term: 'Cessão',
    group: 'Pessoal',
    definition: 'Autorização para o servidor trabalhar temporariamente em outro órgão ou ente, mantendo o vínculo com o de origem.',
    source: 'Lei 8.112/1990, art. 93',
  },
  {
    term: 'Aviso de licitação',
    group: 'Licitações e contratos',
    definition: 'Publicação que anuncia uma licitação: objeto, modalidade, data de abertura e onde obter o edital.',
  },
  {
    term: 'Pregão',
    group: 'Licitações e contratos',
    definition: 'Modalidade de licitação obrigatória para aquisição de bens e serviços comuns. O critério de julgamento é menor preço ou maior desconto.',
    source: 'Lei 14.133/2021, art. 6º, XLI',
  },
  {
    term: 'Dispensa de licitação',
    group: 'Licitações e contratos',
    definition: 'Contratação direta, sem licitação, nas hipóteses listadas em lei (valor baixo, emergência, entre outras).',
    source: 'Lei 14.133/2021, art. 75',
  },
  {
    term: 'Inexigibilidade',
    group: 'Licitações e contratos',
    definition: 'Contratação direta quando a competição é inviável, por exemplo fornecedor exclusivo.',
    source: 'Lei 14.133/2021, art. 74',
  },
  {
    term: 'Extrato de contrato',
    group: 'Licitações e contratos',
    definition: 'Resumo publicado de um contrato assinado: partes, objeto, valor, vigência e número do processo.',
  },
  {
    term: 'Termo aditivo',
    group: 'Licitações e contratos',
    definition: 'Documento que altera um contrato em vigor: prazo, valor ou escopo.',
    source: 'Lei 14.133/2021, art. 124',
  },
  {
    term: 'Ata de registro de preços (ARP)',
    group: 'Licitações e contratos',
    definition: 'Documento que registra preços, fornecedores e condições para contratações futuras, sem obrigar a compra.',
    source: 'Lei 14.133/2021, art. 6º, XLVI, e art. 83',
  },
  {
    term: 'Declaração de inidoneidade',
    group: 'Licitações e contratos',
    definition: 'Sanção mais grave a uma empresa: impede licitar e contratar com toda a Administração Pública, de 3 a 6 anos.',
    source: 'Lei 14.133/2021, art. 156, IV e § 5º',
  },
  {
    term: 'Edição extra',
    group: 'Publicação',
    definition: 'Edição do DOU publicada fora da edição regular do dia, em geral para atos que precisam valer de imediato.',
  },
  {
    term: 'Retificação',
    group: 'Publicação',
    definition: 'Correção de erro em ato já publicado. A versão retificada indica o trecho errado e o correto.',
  },
  {
    term: 'Republicação',
    group: 'Publicação',
    definition: 'Nova publicação integral de um ato, geralmente "por ter saído com incorreção" na versão original.',
  },
  { term: 'AGU', group: 'Siglas', definition: 'Advocacia-Geral da União.' },
  { term: 'ANA', group: 'Siglas', definition: 'Agência Nacional de Águas e Saneamento Básico.' },
  { term: 'CCE / FCE', group: 'Siglas', definition: 'Cargo Comissionado Executivo e Função Comissionada Executiva, criados em 2021 para substituir os antigos DAS e FCPE.', source: 'Lei 14.204/2021' },
  { term: 'CGU', group: 'Siglas', definition: 'Controladoria-Geral da União.' },
  { term: 'Conama', group: 'Siglas', definition: 'Conselho Nacional do Meio Ambiente.' },
  { term: 'Ibama', group: 'Siglas', definition: 'Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis.' },
  { term: 'ICMBio', group: 'Siglas', definition: 'Instituto Chico Mendes de Conservação da Biodiversidade.' },
  { term: 'INSS', group: 'Siglas', definition: 'Instituto Nacional do Seguro Social.' },
  { term: 'MAPA', group: 'Siglas', definition: 'Ministério da Agricultura e Pecuária.' },
  { term: 'MGI', group: 'Siglas', definition: 'Ministério da Gestão e da Inovação em Serviços Públicos.' },
  { term: 'MMA', group: 'Siglas', definition: 'Ministério do Meio Ambiente e Mudança do Clima.' },
  { term: 'PNCP', group: 'Siglas', definition: 'Portal Nacional de Contratações Públicas, onde editais e contratos regidos pela Lei 14.133/2021 são divulgados.', source: 'Lei 14.133/2021, art. 174' },
  { term: 'SIAPE', group: 'Siglas', definition: 'Sistema Integrado de Administração de Pessoal, que processa a folha dos servidores civis federais.' },
  { term: 'TCU', group: 'Siglas', definition: 'Tribunal de Contas da União.' },
  { term: 'UASG', group: 'Siglas', definition: 'Unidade Administrativa de Serviços Gerais: o código do órgão comprador nas licitações federais.' },
]

export const GLOSSARY_GROUPS: GlossaryGroup[] = ['Atos normativos', 'Pessoal', 'Licitações e contratos', 'Publicação', 'Siglas']
