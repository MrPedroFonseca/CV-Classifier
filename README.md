# Analisador de Anúncios de Emprego com IA

Projeto full-stack para analisar anúncios de emprego, comparar requisitos com um currículo e avaliar o encaixe com preferências de trabalho.

## Estado atual

Preparação inicial concluída. Backend e frontend estão separados e os requisitos do projeto foram documentados.

## Estrutura

- `backend/`: API em Node.js, Express e TypeScript
- `frontend/`: interface em React e Vite
- `docs/REQUISITOS.md`: requisitos, contrato da API e plano de desenvolvimento
- `exemplos/`: anúncios e dados fictícios de avaliação
- `.github/copilot-instructions.md`: regras de desenvolvimento do projeto

## Stack planeada

- Node.js 20+
- TypeScript estrito
- Express e Zod
- Vitest
- React e Vite
- Groq e/ou Gemini

## Preparação local

1. Criar `backend/.env` a partir de `backend/.env.example`.
2. Configurar uma chave pessoal de fornecedor; nunca guardar a chave no repositório.
3. Não adicionar currículos reais ao repositório.

## Próxima fase

Criar o backend mínimo com TypeScript e Express e um endpoint `POST /analisar` que chame o modelo configurado no Groq.