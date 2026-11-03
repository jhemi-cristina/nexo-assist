import { PrismaClient, UserRole, TicketType, TicketCategory, TicketPriority, TicketStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const passwordHash = await bcrypt.hash("nexo123", 10);

  // Create users
  const ana = await prisma.user.upsert({
    where: { email: "ana.silva@nexo.com.br" },
    update: {},
    create: {
      name: "Ana Silva",
      email: "ana.silva@nexo.com.br",
      password: passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  const pedro = await prisma.user.upsert({
    where: { email: "pedro.costa@nexo.com.br" },
    update: {},
    create: {
      name: "Pedro Costa",
      email: "pedro.costa@nexo.com.br",
      password: passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  const carla = await prisma.user.upsert({
    where: { email: "carla.lima@nexo.com.br" },
    update: {},
    create: {
      name: "Carla Lima",
      email: "carla.lima@nexo.com.br",
      password: passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  await prisma.user.upsert({
    where: { email: "joao.analyst@nexo.com.br" },
    update: {},
    create: {
      name: "João Analista",
      email: "joao.analyst@nexo.com.br",
      password: passwordHash,
      role: UserRole.ANALYST,
    },
  });

  await prisma.user.upsert({
    where: { email: "maria.analyst@nexo.com.br" },
    update: {},
    create: {
      name: "Maria Analista",
      email: "maria.analyst@nexo.com.br",
      password: passwordHash,
      role: UserRole.ANALYST,
    },
  });

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Create tickets
  await prisma.ticket.upsert({
    where: { number: "INC-20311" },
    update: {},
    create: {
      number: "INC-20311",
      title: "Notebook lento após atualização do Windows",
      description: "Após a última atualização do Windows, o notebook ficou extremamente lento. O tempo de boot aumentou de 30s para mais de 5 minutos e os aplicativos demoram para abrir.",
      type: TicketType.INC,
      category: TicketCategory.HARDWARE,
      priority: TicketPriority.MEDIA,
      status: TicketStatus.WAITING_ANALYST,
      affectedUsers: 1,
      ownerId: ana.id,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
  });

  await prisma.ticket.upsert({
    where: { number: "REQ-10442" },
    update: {},
    create: {
      number: "REQ-10442",
      title: "Segundo monitor para home office",
      description: "Solicito um segundo monitor para melhorar a produtividade no home office. Trabalho com planilhas extensas e a visualização simultânea de documentos é essencial.",
      type: TicketType.REQ,
      category: TicketCategory.HARDWARE,
      priority: TicketPriority.BAIXA,
      status: TicketStatus.APPROVED,
      affectedUsers: 1,
      ownerId: ana.id,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
  });

  await prisma.ticket.upsert({
    where: { number: "INC-20150" },
    update: {},
    create: {
      number: "INC-20150",
      title: "Senha do SAP bloqueada",
      description: "A senha do SAP foi bloqueada após tentativas incorretas. Preciso de acesso urgente para fechar o relatório mensal.",
      type: TicketType.INC,
      category: TicketCategory.ACESSO,
      priority: TicketPriority.MEDIA,
      status: TicketStatus.RESOLVED,
      affectedUsers: 1,
      resolution: "Senha redefinida pelo administrador do SAP. Usuário orientado a usar o auto-atendimento da próxima vez.",
      ownerId: ana.id,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(4),
      resolvedAt: daysAgo(4),
    },
  });

  await prisma.ticket.upsert({
    where: { number: "INC-20399" },
    update: {},
    create: {
      number: "INC-20399",
      title: "VPN não conecta - erro 809",
      description: "Não consigo conectar à VPN corporativa. O cliente apresenta o erro 809 ao tentar estabelecer a conexão. Estou com Windows 10 e não consigo acessar sistemas internos.",
      type: TicketType.INC,
      category: TicketCategory.REDE_VPN,
      priority: TicketPriority.ALTA,
      status: TicketStatus.IN_PROGRESS,
      affectedUsers: 1,
      ownerId: pedro.id,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  });

  await prisma.ticket.upsert({
    where: { number: "INC-20412" },
    update: {},
    create: {
      number: "INC-20412",
      title: "Erro ao enviar e-mails com anexos grandes",
      description: "Estou recebendo erro ao tentar enviar e-mails com anexos acima de 10MB. A mensagem de erro é 'quota exceeded'. Preciso enviar apresentações para clientes.",
      type: TicketType.INC,
      category: TicketCategory.EMAIL,
      priority: TicketPriority.MEDIA,
      status: TicketStatus.OPEN,
      affectedUsers: 1,
      ownerId: carla.id,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  });

  // Help articles
  const articles = [
    {
      title: "VPN com erro 809: como resolver",
      content: "Se você está recebendo o erro 809 ao conectar na VPN, siga os passos abaixo:\n\n1. Desinstale o cliente de VPN atual pelo Painel de Controle\n2. Acesse o portal de softwares em software.nexo.com.br\n3. Baixe e instale a versão mais recente do cliente GlobalProtect\n4. Reinicie o computador\n5. Tente conectar novamente com seu e-mail corporativo e senha de rede\n\nATENÇÃO: Esta solução vale apenas para Windows 10. Se você usa Windows 11, abra um chamado INC na categoria Rede e VPN.",
      tags: ["vpn", "erro 809", "rede", "globalprotect"],
    },
    {
      title: "Horário de atendimento do service desk",
      content: "O service desk da Nexo atende:\n\n- Segunda a sexta-feira: das 8h às 18h\n- Finais de semana e feriados: apenas chamados críticos\n\nChamados com prioridade Crítica têm plantão 24 horas, 7 dias por semana. Para urgências críticas fora do horário, ligue para o ramal de plantão: 4999.\n\nPrazos de atendimento:\n- Crítica: 1 hora\n- Alta: 4 horas úteis\n- Média: 3 dias úteis\n- Baixa: 5 dias úteis",
      tags: ["horário", "atendimento", "plantão", "prazo"],
    },
    {
      title: "Como redefinir sua senha do Windows",
      content: "Para redefinir sua senha do Windows corporativo:\n\n1. Acesse portal.nexo.com.br/senha no navegador\n2. Clique em 'Esqueci minha senha'\n3. Informe seu e-mail corporativo (@nexo.com.br)\n4. Você receberá um link de redefinição no e-mail\n5. Siga as instruções do link para criar uma nova senha\n\nRequisitos da nova senha:\n- Mínimo de 8 caracteres\n- Letras maiúsculas e minúsculas\n- Pelo menos um número\n- Pelo menos um caractere especial",
      tags: ["senha", "windows", "redefinir", "acesso"],
    },
    {
      title: "Como solicitar instalação de software",
      content: "Para solicitar a instalação de um software:\n\n1. Acesse o portal de softwares em software.nexo.com.br\n2. Faça login com seu e-mail corporativo\n3. Navegue pelo catálogo ou use a busca\n4. Selecione o software desejado\n5. Clique em 'Solicitar'\n6. Aguarde a aprovação do seu gestor\n\nSoftwares do catálogo são instalados automaticamente após aprovação. Para softwares fora do catálogo, abra um chamado REQ na categoria Software descrevendo a necessidade e justificativa de negócio.",
      tags: ["software", "instalação", "portal", "requisição"],
    },
    {
      title: "Computador lento: primeiros passos",
      content: "Se seu computador está lento, tente estes passos antes de abrir um chamado:\n\n1. Reinicie o computador completamente (não apenas suspender)\n2. Verifique o Gerenciador de Tarefas (Ctrl+Shift+Esc) para ver quais processos estão consumindo mais recursos\n3. Execute a limpeza de disco: clique com botão direito no disco C: > Propriedades > Limpeza de Disco\n4. Verifique se há atualizações pendentes do Windows\n5. Feche abas e programas desnecessários\n\nSe o problema persistir após esses passos, abra um chamado INC na categoria Hardware com a descrição do comportamento.",
      tags: ["lento", "desempenho", "hardware", "computador"],
    },
    {
      title: "Erro de cota de e-mail: como resolver",
      content: "Se você está recebendo erros relacionados à cota de e-mail:\n\n1. Acesse seu e-mail pelo Outlook ou webmail\n2. Vá em Configurações > E-mail > Gerenciar armazenamento\n3. Exclua e-mails antigos desnecessários, especialmente os da pasta 'Lixo Eletrônico' e 'Itens Excluídos'\n4. Mova anexos importantes para o SharePoint ou OneDrive\n\nCota padrão de e-mail: 25GB por usuário\n\nPara aumentar a cota, abra um chamado REQ na categoria E-mail justificando a necessidade.",
      tags: ["email", "cota", "armazenamento", "outlook"],
    },
    {
      title: "Como configurar a autenticação de dois fatores (2FA)",
      content: "A autenticação de dois fatores adiciona segurança extra à sua conta:\n\n1. Acesse conta.nexo.com.br/segurança\n2. Clique em 'Autenticação de dois fatores'\n3. Escolha o método preferido:\n   - Aplicativo autenticador (recomendado): Microsoft Authenticator ou Google Authenticator\n   - SMS para celular cadastrado\n4. Siga as instruções na tela\n5. Guarde os códigos de recuperação em local seguro\n\nApós configurar, você precisará do segundo fator ao acessar sistemas corporativos de dispositivos novos.",
      tags: ["2fa", "segurança", "autenticação", "conta"],
    },
    {
      title: "Como solicitar equipamento ou hardware",
      content: "Para solicitar um equipamento de hardware (monitor, teclado, mouse, headset, etc.):\n\n1. Abra um chamado do tipo REQ (Requisição)\n2. Selecione a categoria: Hardware\n3. No título, descreva o equipamento solicitado\n4. Na descrição, inclua:\n   - Especificações desejadas (se houver preferência)\n   - Justificativa de negócio\n   - Urgência e impacto\n5. A prioridade padrão para requisições de hardware é Baixa\n\nO processo de aprovação pode levar até 5 dias úteis. Equipamentos substituídos devem ser devolvidos ao almoxarifado de TI.",
      tags: ["hardware", "equipamento", "requisição", "monitor"],
    },
    {
      title: "SAP: senha bloqueada ou erro de acesso",
      content: "A senha do SAP bloqueia automaticamente após 3 tentativas incorretas de login.\n\nPara desbloquear:\n\nOpção 1 (mais rápida): Ligue para o ramal 4000 (suporte SAP) nos horários de atendimento\n\nOpção 2: Abra um chamado INC:\n- Tipo: INC (Incidente)\n- Categoria: Acesso\n- Prioridade: depende do impacto nas atividades\n- Descreva o sistema afetado (SAP módulo/transação)\n\nOBS: A senha do SAP é independente da senha do Windows. Para redefinir a senha do Windows, acesse portal.nexo.com.br/senha.",
      tags: ["sap", "senha bloqueada", "acesso", "erp"],
    },
    {
      title: "Acesso remoto com VPN: guia rápido",
      content: "Para acessar a rede corporativa remotamente via VPN:\n\n1. Baixe o cliente GlobalProtect em vpn.nexo.com.br\n2. Instale o cliente no seu computador\n3. Abra o GlobalProtect\n4. No campo 'Portal', informe: vpn.nexo.com.br\n5. Use seu e-mail corporativo como usuário\n6. Use sua senha de rede (mesma do Windows) como senha\n7. Clique em 'Conectar'\n\nSistemas compatíveis:\n- Windows 10 e 11\n- macOS 11 ou superior\n\nProblemas de conexão? Consulte o artigo 'VPN com erro 809' ou abra um chamado INC na categoria Rede e VPN.",
      tags: ["vpn", "acesso remoto", "globalprotect", "rede"],
    },
  ];

  for (const article of articles) {
    const existing = await prisma.helpArticle.findFirst({
      where: { title: article.title },
    });
    if (!existing) {
      await prisma.helpArticle.create({ data: article });
    }
  }

  console.log("Seed completed successfully.");
  console.log("Users created:");
  console.log("  - ana.silva@nexo.com.br (EMPLOYEE, senha: nexo123)");
  console.log("  - pedro.costa@nexo.com.br (EMPLOYEE, senha: nexo123)");
  console.log("  - carla.lima@nexo.com.br (EMPLOYEE, senha: nexo123)");
  console.log("  - joao.analyst@nexo.com.br (ANALYST, senha: nexo123)");
  console.log("  - maria.analyst@nexo.com.br (ANALYST, senha: nexo123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
