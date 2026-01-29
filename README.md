# SuperNavi - Viewer

Aplicação principal do SuperNavi para visualização e análise colaborativa de lâminas histológicas com suporte a inteligência artificial.

## Tecnologias

- **Vue 3** + **Vuetify 3** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Pinia** - Gerenciamento de estado
- **OpenSeadragon** - Visualização de imagens Deep Zoom (WSI)
- **Bun** - Runtime e package manager

## Funcionalidades

### Visualizador de Lâminas
- Visualização de imagens WSI (Whole Slide Images) em formato DZI
- Navegação com pan, zoom e rotação
- Barra de ferramentas flutuante estilo studio
- Modo foco para visualização sem distrações
- Barra de status com informações de zoom, escala e coordenadas

### Sistema de Anotações (ROI)
- Criação de regiões de interesse (retângulo, seta)
- Ferramenta de medição
- Cores automáticas para diferentes anotações
- Visualização/ocultação de marcadores

### Colaboração
- Discussão por ROI com múltiplos patologistas
- Chat em tempo real por região de interesse
- Sistema de participantes com status online
- Histórico de mensagens com timestamps

### Inteligência Artificial
- **Chat de Anotações**: Toggle para ativar/desativar IA na discussão
- **Aba IA**: Análise geral do caso/lâmina
- Análises com nível de confiança
- Sugestões diagnósticas baseadas em achados

### Menu Principal (Drawer)
- **Casos**: Fila de trabalho, casos recentes, busca de casos
- **Colaboração**: Casos compartilhados, atividade da equipe, convites
- **Relatórios**: Novo, rascunhos, finalizados
- **Configurações**: Tema, preferências do viewer, ajuda

### Busca de Casos
- Pesquisa por ID, paciente, órgão ou patologista
- Filtros por status (Pendente, Em Análise, Urgente, Finalizado)
- Visualização de detalhes do caso

## Comandos

```bash
# Instalar dependências
bun install

# Servidor de desenvolvimento (http://localhost:5173)
bun dev

# Build para produção
bun build

# Preview do build
bun preview

# Verificação de tipos
bun type-check

# Linting
bun lint
```

## Estrutura do Projeto

```
app/
├── src/
│   ├── components/       # Componentes Vue
│   │   └── DziViewer.vue # Viewer OpenSeadragon
│   ├── composables/      # Composables Vue
│   │   └── useViewer.ts  # Estado global do viewer
│   ├── layouts/          # Layouts da aplicação
│   │   └── default.vue   # Layout principal com toolbar e painéis
│   ├── pages/            # Páginas (file-based routing)
│   │   └── viewer.vue    # Página do visualizador
│   ├── plugins/          # Plugins Vue
│   │   └── vuetify.ts    # Configuração Vuetify + tema médico
│   ├── router/           # Configuração Vue Router
│   └── styles/           # Estilos globais
├── public/
│   └── data/             # Arquivos DZI para teste
└── vite.config.mts       # Configuração Vite
```

## Tema

O sistema usa um tema médico/patologia personalizado:

- **Primary**: `#2C5F8D` (Azul médico)
- **Secondary**: `#4A90A4` (Teal médico)
- **Accent**: `#7FC8A9` (Verde saúde)
- Suporte a modo claro e escuro

## Integração

Consulte [INTEGRATION.md](./INTEGRATION.md) para detalhes sobre a integração do DziViewer e arquitetura de estado.
