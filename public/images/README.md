# Guia de Imagens para SuperNavi

Este diretório contém imagens de fundo para a landing page do SuperNavi.

## Imagens Necessárias

### 1. Hero Section Background (`hero-background.jpg`)
- **Recomendação**: Imagem de microscópio ou lâminas histológicas em laboratório
- **Dimensões**: Mínimo 2000x1200px
- **Formato**: JPG ou WebP otimizado
- **Características**:
  - Tons azuis/verdes profissionais
  - Ambiente laboratorial moderno
  - Boa para overlay (será coberta por gradiente azul semi-transparente)

**Sugestões de busca**:
- "digital pathology microscope"
- "histology laboratory modern"
- "medical laboratory technology"
- "pathology slides scanning"

### 2. Technology Section Background (`tech-background.jpg`)
- **Recomendação**: Visualização de células ou tecidos microscópicos
- **Dimensões**: Mínimo 2000x1000px
- **Formato**: JPG ou WebP otimizado
- **Características**:
  - Imagem científica abstrata
  - Cores suaves (será aplicado overlay branco semi-transparente)
  - Detalhes microscópicos interessantes

**Sugestões de busca**:
- "microscopy cells abstract"
- "histology tissue slides"
- "pathology microscope view"
- "digital microscopy background"

### 3. Coming Soon Card Background (`coming-soon-background.jpg`)
- **Recomendação**: Imagem de equipamento médico/microscópio ou padrão de células
- **Dimensões**: Mínimo 1600x1200px
- **Formato**: JPG ou WebP otimizado
- **Características**:
  - Pode ter mais contraste
  - Será coberta por gradiente azul forte
  - Detalhes que criem profundidade

**Sugestões de busca**:
- "microscope lens close up"
- "medical technology abstract"
- "laboratory equipment modern"

## Como Usar Imagens Personalizadas

### Opção 1: Usar Imagens Locais

1. Adicione suas imagens nesta pasta (`public/images/`)
2. Atualize os URLs no arquivo `src/pages/index.vue`:

```scss
// Hero Section (linha ~248)
.hero-section {
  background:
    linear-gradient(135deg, rgba(44, 95, 141, 0.95) 0%, rgba(74, 144, 164, 0.92) 50%, rgba(44, 95, 141, 0.97) 100%),
    url('/images/hero-background.jpg') center/cover;
}

// Tech Section (linha ~391)
.tech-section {
  background:
    linear-gradient(135deg, rgba(44, 95, 141, 0.03) 0%, rgba(127, 200, 169, 0.05) 100%),
    url('/images/tech-background.jpg') center/cover;
}

// Coming Soon Card (linha ~435)
.coming-soon-card {
  background:
    linear-gradient(135deg, rgba(44, 95, 141, 0.95) 0%, rgba(74, 144, 164, 0.92) 100%),
    url('/images/coming-soon-background.jpg') center/cover !important;
}
```

### Opção 2: Usar URLs Externas (Atual)

Atualmente, a página usa imagens do Unsplash como placeholder. Para melhor performance e personalização, recomendamos usar imagens locais específicas de patologia digital.

## Otimização de Imagens

Para melhor performance:

1. **Comprima as imagens**: Use ferramentas como:
   - [TinyPNG](https://tinypng.com/)
   - [Squoosh](https://squoosh.app/)
   - ImageOptim (macOS)

2. **Converta para WebP**: Formato moderno com melhor compressão
   ```bash
   # Usando ImageMagick
   convert hero-background.jpg -quality 85 hero-background.webp
   ```

3. **Forneça múltiplas resoluções** para dispositivos diferentes:
   - Desktop: 2000px largura
   - Tablet: 1200px largura
   - Mobile: 800px largura

## Fontes de Imagens de Patologia Digital

### Gratuitas
- [Unsplash](https://unsplash.com/s/photos/pathology) - Buscar "pathology", "microscope", "laboratory"
- [Pexels](https://www.pexels.com/search/medical%20laboratory/) - Imagens médicas gratuitas
- [Pixabay](https://pixabay.com/images/search/microscope/) - Buscar "microscope", "cells"

### Profissionais/Científicas
- [The Cancer Imaging Archive](https://www.cancerimagingarchive.net/)
- [NIH Image Gallery](https://www.nih.gov/news-events/images-videos) - Imagens científicas
- Bancos de imagens médicas com licença comercial

## Cores do Tema

Para garantir harmonia visual, as imagens devem combinar com a paleta de cores:

- **Primary**: #2C5F8D (Azul médico)
- **Secondary**: #4A90A4 (Teal médico)
- **Accent**: #7FC8A9 (Verde saúde)

Imagens com tons azuis, verdes ou neutros funcionam melhor com os overlays aplicados.
