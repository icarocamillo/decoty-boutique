// Cenários de sessão do card de múltiplas abas (além da reprodução básica em repro.mjs).
import { launchBrowser, installMocks, seedSession, setVisibility, probe, waitFor, openLoggedPage } from './repro.mjs'
const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const rec = (id, nome, passou, detalhe) => { results.push({ id, passou }); console.log(`${passou ? 'PASSOU' : 'FALHOU'}  ${id}  ${nome}\n        ${detalhe}`) }
const rest = (log, t, page, path) => log.filter(e => e.t >= t && e.page === page && (path ? e.path === path : e.path.startsWith('/rest/v1/')))
const browser = await launchBrowser()

async function novoContexto(opts = {}) {
  const context = await browser.newContext()
  const log = []; const names = new Map()
  await installMocks(context, log, names, opts)
  const ref = await seedSession(context, log, names)
  return { context, log, names, ref }
}
async function abrirErp(c, nome = 'A') {
  const p = await openLoggedPage(c.context, c.log, c.names, nome, '/erp/home')
  await waitFor(() => c.log.some(e => e.page === nome && e.path === '/rest/v1/stock_entries'), 20000)
  await sleep(1200)
  return p
}

// ---------- S1: alternar várias vezes ----------
{
  const c = await novoContexto(); const A = await abrirErp(c)
  let ok = true; const cont = []
  for (let i = 0; i < 5; i++) {
    await setVisibility(A, 'hidden'); await sleep(300)
    const t = Date.now(); await setVisibility(A, 'visible'); await sleep(2600)
    const r = await probe(A, 4000); cont.push(rest(c.log, t, 'A').length)
    if (r !== 'respondeu') ok = false
  }
  rec('S1', 'Alternar de aba 5 vezes seguidas: a aplicação responde depois de cada volta', ok && cont.every(n => n > 0 && n <= 16), `requisições REST por volta: ${cont.join(', ')}`)
  await c.context.close()
}

// ---------- S2: token vencido enquanto a aba estava em segundo plano ----------
{
  const c = await novoContexto(); const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300)
  await A.evaluate(ref => { const k = `sb-${ref}-auth-token`; const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) + 5; localStorage.setItem(k, JSON.stringify(s)) }, c.ref)
  const t = Date.now(); await setVisibility(A, 'visible'); await sleep(4000)
  const renovou = c.log.filter(e => e.t >= t && e.page === 'A' && e.path === '/auth/v1/token' && e.q.includes('refresh_token')).length
  const recargas = rest(c.log, t, 'A', '/rest/v1/stock_entries').length
  const r = await probe(A)
  rec('S2', 'Token perto de vencer ao voltar para a aba: é renovado sozinho, sem travar e sem recarga extra de dados', renovou >= 1 && r === 'respondeu' && recargas === 1 && A.url().endsWith('/erp/home'), `renovações de token: ${renovou} | recargas completas de dados: ${recargas} | consulta: ${r} | página: ${new URL(A.url()).pathname}`)
  await c.context.close()
}

// ---------- S3: logout em uma aba reflete na outra ----------
{
  const c = await novoContexto(); const A = await abrirErp(c, 'A'); const B = await abrirErp(c, 'B')
  await B.evaluate(async () => { const m = await import('/src/services/supabaseClient.ts'); await m.supabase.auth.signOut() })
  const saiuA = await waitFor(() => A.url().includes('/erp/login'), 6000)
  const saiuB = await waitFor(() => B.url().includes('/erp/login'), 6000)
  const semSessao = await A.evaluate(ref => localStorage.getItem(`sb-${ref}-auth-token`) === null, c.ref)
  rec('S3', 'Logout em uma aba: a outra aba também sai e vai para a tela de login', saiuA && saiuB && semSessao, `aba A em ${new URL(A.url()).pathname} | aba B em ${new URL(B.url()).pathname} | sessão removida do navegador: ${semSessao}`)
  await c.context.close()
}

// ---------- S4: usuário desativado enquanto a aba estava em segundo plano ----------
{
  let ativo = true
  const c = await novoContexto({ profileActive: () => ativo }); const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300); ativo = false
  await setVisibility(A, 'visible')
  const saiu = await waitFor(() => A.url().includes('/erp/login'), 8000)
  rec('S4', 'Funcionário desativado pela gerência: ao voltar para a aba ele é deslogado', saiu, `página: ${new URL(A.url()).pathname}`)
  await c.context.close()
}

// ---------- S5: rede lenta ao voltar ----------
{
  let lento = 0
  const c = await novoContexto({ delayMs: () => lento }); const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300); lento = 1500
  const t = Date.now(); await setVisibility(A, 'visible'); await sleep(5500)
  const r = await probe(A, 8000)
  rec('S5', 'Rede lenta (1,5 s por requisição) ao voltar para a aba: a aplicação continua respondendo', r === 'respondeu' && rest(c.log, t, 'A').length > 0 && A.url().endsWith('/erp/home'), `consulta: ${r} | requisições após voltar: ${rest(c.log, t, 'A').length}`)
  await c.context.close()
}

// ---------- S6: falha passageira ao reler o perfil na volta não derruba o funcionário ----------
{
  let falhar = false
  const c = await novoContexto({ profileResponse: () => (falhar ? { status: 500, body: { message: 'erro simulado' } } : null) }); const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300); falhar = true
  await setVisibility(A, 'visible'); await sleep(3500); falhar = false
  const r = await probe(A)
  rec('S6', 'Falha passageira ao reler o perfil na volta: o funcionário continua no ERP (não é tratado como cliente)', A.url().endsWith('/erp/home') && r === 'respondeu', `página: ${new URL(A.url()).pathname} | consulta: ${r}`)
  await c.context.close()
}

// ---------- S7: falha passageira do perfil na PRIMEIRA carga é tentada de novo ----------
{
  let chamadas = 0
  const c = await novoContexto({ profileResponse: u => (u.search.includes('id=eq.') && ++chamadas <= 1 ? { status: 500, body: { message: 'erro simulado' } } : null) })
  const A = await openLoggedPage(c.context, c.log, c.names, 'A', '/erp/home')
  const carregou = await waitFor(() => c.log.some(e => e.page === 'A' && e.path === '/rest/v1/stock_entries'), 15000)
  rec('S7', 'Primeira carga com uma falha passageira ao ler o perfil: tenta de novo e abre o ERP', carregou && A.url().endsWith('/erp/home'), `página: ${new URL(A.url()).pathname} | leituras do perfil: ${chamadas}`)
  await c.context.close()
}

// ---------- S8: ERP e site abertos no mesmo navegador ----------
{
  const c = await novoContexto(); const A = await abrirErp(c, 'A')
  const S = await openLoggedPage(c.context, c.log, c.names, 'S', '/')
  await waitFor(() => c.log.some(e => e.page === 'S' && e.path === '/rest/v1/products'), 20000); await sleep(1000)
  let ok = true
  for (let i = 0; i < 3; i++) {
    await setVisibility(A, 'hidden'); await setVisibility(S, 'visible'); await sleep(1800)
    if ((await probe(S, 4000)) !== 'respondeu') ok = false
    await setVisibility(S, 'hidden'); await setVisibility(A, 'visible'); await sleep(1800)
    if ((await probe(A, 4000)) !== 'respondeu') ok = false
  }
  rec('S8', 'ERP e site abertos lado a lado, alternando 3 vezes: os dois continuam respondendo', ok && A.url().endsWith('/erp/home'), `ERP em ${new URL(A.url()).pathname} | site em ${new URL(S.url()).pathname}`)
  await c.context.close()
}

// ---------- S9: login pela tela, com cada tipo de usuário ----------
for (const caso of [
  { id: 'S9.1', nome: 'Login de funcionário pela tela: entra no ERP', perfil: null, espera: p => p.url().endsWith('/erp/home'), texto: null },
  { id: 'S9.2', nome: 'Login de cliente do site na tela do ERP: é recusado com a mensagem de acesso negado', perfil: { status: 200, body: [] }, espera: p => p.url().includes('/erp/login'), texto: 'Acesso negado' },
  { id: 'S9.3', nome: 'Login de funcionário desativado: é recusado com a mensagem de usuário desativado', perfil: { status: 200, body: [{ name: 'X', role: 'manager', active: false, email: 'x@teste.local' }] }, espera: p => p.url().includes('/erp/login'), texto: 'desativado' },
]) {
  const context = await browser.newContext(); const log = []; const names = new Map()
  await installMocks(context, log, names, { profileResponse: () => caso.perfil })
  const P = await context.newPage(); names.set(P, 'L')
  await P.goto(BASE + '/erp/login', { waitUntil: 'domcontentloaded' })
  await P.locator('input[type="email"]').fill('gerente@teste.local')
  await P.locator('input[type="password"]').fill('senha-de-teste')
  await P.locator('button[type="submit"]').click()
  await sleep(3500)
  const texto = await P.evaluate(() => document.body.innerText)
  const ok = caso.espera(P) && (!caso.texto || texto.includes(caso.texto))
  rec(caso.id, caso.nome, ok, `página: ${new URL(P.url()).pathname}` + (caso.texto ? ` | mensagem "${caso.texto}" na tela: ${texto.includes(caso.texto)}` : ''))
  await context.close()
}

// ---------- S10: sessão encerrada no servidor (token de renovação recusado) ----------
{
  let recusar = false
  const c = await novoContexto({ intercept: u => (recusar && u.pathname.startsWith('/auth/v1/token') ? { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' } } : undefined) })
  const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300)
  await A.evaluate(ref => { const k = `sb-${ref}-auth-token`; const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 60; localStorage.setItem(k, JSON.stringify(s)) }, c.ref)
  recusar = true
  await setVisibility(A, 'visible')
  const foiParaLogin = await waitFor(() => A.url().includes('/erp/login'), 10000)
  const r = await probe(A, 5000)
  rec('S10', 'Sessão encerrada no servidor enquanto a aba estava em segundo plano: vai para o login, sem travar', foiParaLogin && r === 'respondeu', `página: ${new URL(A.url()).pathname} | consulta: ${r}`)
  await c.context.close()
}

// ---------- S11: a primeira renovação de token fica pendurada para sempre (conexão morta) ----------
{
  let pendurar = false; let penduradas = 0
  const c = await novoContexto({ intercept: u => { if (pendurar && u.pathname.startsWith('/auth/v1/token') && penduradas === 0) { penduradas++; return 'hang' } return undefined } })
  const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300)
  await A.evaluate(ref => { const k = `sb-${ref}-auth-token`; const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) + 5; localStorage.setItem(k, JSON.stringify(s)) }, c.ref)
  pendurar = true
  const t = Date.now(); await setVisibility(A, 'visible')
  await sleep(4000)
  const durante = await probe(A, 2000)
  const voltou = await waitFor(async () => (await probe(A, 3000)) === 'respondeu', 30000, 500)
  const segundos = Math.round((Date.now() - t) / 1000)
  const B = await openLoggedPage(c.context, c.log, c.names, 'B', '/erp/home'); await sleep(3500)
  const pB = await probe(B, 4000)
  rec('S11', 'Renovação de token pendurada (conexão morta): a tentativa é abandonada, a renovação é refeita e as abas voltam a responder sozinhas', voltou && pB === 'respondeu' && A.url().endsWith('/erp/home'), `consulta 4 s após voltar: ${durante} | voltou a responder em ~${segundos} s | segunda aba: ${pB} | página: ${new URL(A.url()).pathname}`)
  await c.context.close()
}

// ---------- S12: login logo depois de logout, com uma releitura de perfil antiga ainda pendurada ----------
{
  let atrasoPerfil = 0
  const c = await novoContexto({ delayMs: u => (u.pathname === '/rest/v1/profiles' ? atrasoPerfil : 0) })
  const A = await abrirErp(c)
  await setVisibility(A, 'hidden'); await sleep(300); atrasoPerfil = 25000
  await setVisibility(A, 'visible'); await sleep(1500)             // revalidação começa e fica pendurada
  await A.evaluate(async () => { const m = await import('/src/services/supabaseClient.ts'); await m.supabase.auth.signOut() })
  await waitFor(() => A.url().includes('/erp/login'), 6000)
  atrasoPerfil = 0
  await A.locator('input[type="email"]').fill('gerente@teste.local')
  await A.locator('input[type="password"]').fill('senha-de-teste')
  const t = Date.now(); await A.locator('button[type="submit"]').click()
  const entrou = await waitFor(() => A.url().endsWith('/erp/home'), 7000)
  rec('S12', 'Sair e entrar de novo com uma releitura de perfil antiga ainda pendurada: o login conclui normalmente', entrou, `página: ${new URL(A.url()).pathname} | tempo do login: ${((Date.now() - t) / 1000).toFixed(1)} s`)
  await c.context.close()
}

// ---------- S13: cliente do site em Minha conta, com falha passageira ao reler o cadastro na volta ----------
{
  let falharClientes = false
  const cliente = { id: '11111111-1111-4111-8111-111111111111', nome: 'Cliente Teste', email: 'gerente@teste.local', origin: 'site_only', user_id: '11111111-1111-4111-8111-111111111111', saldo_vale_presente: 0, itens_pendentes_provador: 0, pode_provador: false }
  const c = await novoContexto({
    profileResponse: () => ({ status: 200, body: [] }),
    intercept: u => (u.pathname === '/rest/v1/clients' ? (falharClientes ? { status: 500, body: { message: 'erro simulado' } } : { status: 200, body: [cliente] }) : undefined),
  })
  const S = await openLoggedPage(c.context, c.log, c.names, 'S', '/minha-conta')
  await waitFor(() => c.log.some(e => e.page === 'S' && e.path === '/rest/v1/order_reservations'), 20000); await sleep(1200)
  const antes = new URL(S.url()).pathname
  await setVisibility(S, 'hidden'); await sleep(300); falharClientes = true
  await setVisibility(S, 'visible'); await sleep(3500); falharClientes = false
  rec('S13', 'Cliente do site em Minha conta: falha passageira ao reler o cadastro na volta não o manda para a tela de login', antes === '/minha-conta' && new URL(S.url()).pathname === '/minha-conta', `antes: ${antes} | depois: ${new URL(S.url()).pathname}`)
  await c.context.close()
}

await browser.close()
const falhas = results.filter(r => !r.passou).length
console.log(`\nRESUMO (sessão): ${results.length - falhas} de ${results.length} verificações passaram`)
process.exit(falhas ? 1 : 0)
