# Testes de sessão e de múltiplas abas

Roteiros que reproduzem o defeito do card "Conexão com o sistema cai ao abrir ou alternar entre múltiplas abas do ERP e do site" e conferem a correção. Rodam em um navegador real contra o servidor de desenvolvimento.

Todo o tráfego para `*.supabase.co` é interceptado e respondido por simulação (`installMocks` em `repro.mjs`). Nenhuma requisição chega ao projeto real, nem para ler nem para gravar. A sessão de teste é fictícia.

## Como rodar

```bash
# 1) Servidor de desenvolvimento. Valores falsos bastam, porque nada chega ao Supabase.
VITE_SUPABASE_URL=https://projeto-de-teste.supabase.co VITE_SUPABASE_ANON_KEY=chave-falsa npm run dev

# 2) Em outro terminal, uma vez: a biblioteca de automação, sem alterar o package.json.
npm install --no-save playwright

# 3) Os roteiros (usam o Chrome instalado na máquina).
cd tests/e2e/sessao-multiplas-abas
node repro.mjs       # o defeito do card: voltar para a aba e abrir uma segunda aba
node sessao.mjs      # 15 cenários de sessão
node forms.mjs       # 11 cenários de formulário em preenchimento
node duas-abas.mjs   # gravações e leituras com duas abas
```

Variáveis:

- `BASE`: endereço do servidor de desenvolvimento. Padrão `http://127.0.0.1:3000`.
- `BROWSER`: `chrome` (padrão), `firefox` ou `webkit`. Para os dois últimos, baixar o navegador antes com `npx playwright install firefox` (ou `webkit`). Esse comando remove do cache do Playwright os navegadores que nenhuma instalação registrada usa.

Cada roteiro imprime `PASSOU` ou `FALHOU` por verificação e termina com código de saída diferente de zero se algo falhar.

## O que cada roteiro cobre

| Roteiro | Cobre |
| :--- | :--- |
| `repro.mjs` | Usuário logado volta para a aba: a aplicação recarrega e uma consulta responde sem F5. Uma segunda aba aberta em seguida carrega. Visitante sem login como controle. |
| `sessao.mjs` | Alternar 5 vezes; token perto de vencer; logout em outra aba; funcionário desativado; rede lenta; falha passageira ao ler o perfil (na volta e na primeira carga); ERP e site lado a lado; login de funcionário, de cliente e de desativado; sessão encerrada no servidor; renovação de token pendurada; login logo depois de logout; cliente do site com falha passageira ao reler o cadastro. |
| `forms.mjs` | Produto, fornecedor, perfil do funcionário e "meus dados" do site: o que foi digitado continua depois de trocar de aba, inclusive quando outra aba altera outro registro ou o mesmo registro; formulário ainda sem edição acompanha o banco; salvar depois de voltar grava. |
| `duas-abas.mjs` | Uma aba grava enquanto a outra volta do segundo plano ou renova o token; cliente do site favorita em uma aba e envia reserva na outra; perfil demorando 4 s; 20 alternâncias rápidas sem trava presa. |

## Como a troca de aba é simulada

Os roteiros alteram `document.visibilityState` e disparam o evento `visibilitychange`, que é exatamente o que o supabase-js e o `DataContext` observam. Não há troca real de aba nem aba parada por horas, e o navegador não limita os temporizadores como faz com uma aba realmente em segundo plano.

O roteiro consulta o cliente Supabase da própria aplicação com `import('/src/services/supabaseClient.ts')`. Isso só funciona com o servidor de desenvolvimento do Vite, não com o build de produção.

## Resultado em 2026-11-15

| Roteiro | Código anterior à correção | Corrigido, Chrome | Corrigido, Firefox |
| :--- | :--- | :--- | :--- |
| `repro.mjs` | 2 de 6 (Chrome e Firefox) | 6 de 6 | 6 de 6 |
| `sessao.mjs` | não se aplica | 15 de 15 | 15 de 15 |
| `forms.mjs` | não se aplica | 11 de 11 | 11 de 11 |
| `duas-abas.mjs` | não rodado por inteiro | 6 de 6 | não rodado |

Não testado: Safari. O WebKit do Playwright não abriu na máquina do teste por falta da biblioteca de sistema `libicu74`.
