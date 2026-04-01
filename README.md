# 🏛️ Abächerly Licitações - Sistema de Automação

Sistema de automação de licitações com agentes de IA desenvolvido para a Abächerly Licitações.

## 🚀 Tecnologias

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Hospedagem Frontend:** Vercel
- **Autenticação:** Firebase Auth
- **Banco de Dados:** Firestore
- **Backend Agentes:** Python + LangGraph + Cloud Run
- **Calendário:** Google Calendar API
- **Armazenamento:** Cloud Storage
- **Exportação:** Google Sheets

## 🎨 Design System

### Cores
- `#2c4a70` - Destaques e títulos (Primary)
- `#4674e8` - Apoio secundário (Secondary)
- `#1a2b45` - Textos para fundo claro (Dark)
- `#ffffff` - Textos para fundo escuro (Light)
- `#d64b16` - Linhas sutis e divisões (Accent)

### Fonte
- **Libertinus Serif** - Fonte principal para todo o sistema

## 👥 Perfis de Usuário

| Perfil | Permissões |
|--------|------------|
| **Super Admin** | Controle total do sistema |
| **Admin** | Gestão completa exceto configurações técnicas |
| **Operador** | Operações básicas (criar licitações, ver dados) |

## 📁 Estrutura do Projeto

```
abacherly-licitacoes/
├── src/
│   ├── app/                    # Páginas Next.js (App Router)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── licitacoes/
│   │   ├── agenda/
│   │   ├── certidoes/
│   │   ├── pagamentos/
│   │   ├── usuarios/
│   │   └── configuracoes/
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── contexts/               # Contextos React
│   │   └── AuthContext.tsx
│   ├── lib/                    # Bibliotecas e configurações
│   │   └── firebase.ts
│   └── styles/                 # Estilos globais
│       └── globals.css
├── public/
│   └── images/                 # Logos e imagens
├── .env.example               # Variáveis de ambiente
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/BruAmaralTec/abacherly-licitacoes.git
cd abacherly-licitacoes
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
# Edite o arquivo .env.local com suas credenciais
```

4. Execute em desenvolvimento:
```bash
npm run dev
```

5. Acesse: http://localhost:3000

## 🔧 Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication (Email/Password)
3. Crie um banco Firestore
4. Copie as credenciais para `.env.local`

## 📦 Deploy na Vercel

1. Conecte seu repositório GitHub à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

## 📄 Licença

Projeto proprietário - Abächerly Licitações

---

**Fluxo Agêntico de IA produzido por [EN1 Soluções em IA](https://en1.com.br)**
