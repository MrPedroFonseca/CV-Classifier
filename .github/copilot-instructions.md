# Instruções do projeto

## Objetivo

O projeto é um analisador de anúncios de emprego com IA. Deve receber um anúncio e um currículo, enviá-los a um modelo escolhido e devolver dados estruturados e uma avaliação de compatibilidade.

## Documentação

- Seguir `docs/REQUISITOS.md`.
- Não inventar requisitos que não estejam documentados.
- Implementar o projeto em fases pequenas e validar cada fase antes de avançar.

## Stack

- Node.js 20+
- Backend em TypeScript estrito e Express
- Zod para validação
- Vitest para testes
- pdf-parse e multer para PDFs
- Frontend em React com Vite e TypeScript
- Groq e, mais tarde, Gemini

## Estrutura

- `backend/src/index.ts`: arranque do servidor
- `backend/src/config/provedores.ts`: configuração central dos fornecedores
- `backend/src/routes/analisar.ts`: rotas HTTP
- `backend/src/services/modelo.ts`: toda a comunicação com modelos
- `backend/src/services/prompt.ts`: construção e versionamento do prompt
- `backend/src/schemas/resultado.ts`: schema Zod da resposta
- `backend/tests/`: testes do backend
- `frontend/src/`: aplicação React
- `docs/REQUISITOS.md`: requisitos e contrato da API
- `exemplos/`: anúncios fictícios e dados de avaliação

## Regras obrigatórias

- Usar TypeScript em modo estrito.
- Validar entradas e respostas externas.
- Nunca enviar chaves para o frontend.
- Guardar chaves apenas em ficheiros `.env`.
- Nunca guardar ou registar o currículo no backend.
- Nunca registar chaves, currículos ou anúncios em logs.
- Remover email, telefone e morada do currículo antes de o enviar ao modelo.
- Usar `null` para dados não existentes; não inventar valores.
- Permitir apenas fornecedores e modelos definidos na configuração.
- Toda a chamada a modelos deve passar por `chamarModelo()`.
- Fazer timeout de 30 segundos e tratar limites e erros conforme os requisitos.
- Escrever testes Vitest para lógica crítica antes ou durante a implementação.
- Não alterar requisitos fora das fases sem explicação.
- Confirmar nomes de modelos e APIs oficiais, pois mudam com frequência.

*** Add File: C:\Projects\CVClassifier\backend\.env.example
# Chave da Groq
# Obter uma chave no painel oficial da Groq e guardar aqui um valor local.
GROQ_API_KEY=

# Porta do servidor
PORT=3001
