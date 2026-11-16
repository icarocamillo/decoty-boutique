// Gravações e leituras com duas abas abertas (card de múltiplas abas). Uso: node duas-abas.mjs [a|b|c|d|e|all]
// Todo o tráfego para *.supabase.co é interceptado por installMocks (repro.mjs). Nada sai para a rede real.
import { launchBrowser, installMocks, seedSession, setVisibility, probe, waitFor, openLoggedPage } from './repro.mjs'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const ALVO = process.argv[2] || 'all'
const UID = '11111111-1111-4111-8111-111111111111'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const T = '2026-01-01T00:00:00+00:00'
const results = []
const rec = (id, nome, passou, detalhe) => { results.push({ id, passou }); console.log(`${passou ? 'PASSOU' : 'FALHOU'}  ${id}  ${nome}\n        ${detalhe}`) }

// Atraso por endpoint, registrado DEPOIS do installMocks (Playwright consulta a última rota primeiro e
// route.fallback() repassa para a rota anterior, que faz o mock).
const atraso = { token: 0, profiles: 0 }
async function retardar(context) {
  await context.route(u => u.pathname.startsWith('/auth/v1/token') && /\.supabase\.co$/.test(u.hostname), async r => {
    if (atraso.token) await sleep(atraso.token)
    await r.fallback()
  })
  await context.route(u => u.pathname === '/rest/v1/profiles' && /\.supabase\.co$/.test(u.hostname), async r => {
    if (atraso.profiles) await sleep(atraso.profiles)
    await r.fallback()
  })
}

const browser = await launchBrowser()
async function novo(opts = {}) {
  const context = await browser.newContext()
  const log = []; const names = new Map()
  await installMocks(context, log, names, opts)
  await retardar(context)
  const ref = await seedSession(context, log, names)
  return { context, log, names, ref }
}
async function abrirErp(c, nome, path = '/erp/home') {
  const p = await openLoggedPage(c.context, c.log, c.names, nome, path)
  await waitFor(() => c.log.some(e => e.page === nome && e.path === '/rest/v1/stock_entries'), 20000)
  await sleep(1200)
  return p
}
// Grava via PAGE usando a camada de serviço da aplicação (mesmo cliente, mesma trava de sessão).
const gravarFornecedor = page => page.evaluate(async () => {
  const bs = await import('/src/services/backendService.ts')
  const ok = await Promise.race([
    bs.backendService.createSupplier({ nome_empresa: 'Fornecedor Teste Extra LTDA', fantasy_name: 'X', nome_contato: 'Y', cnpj_cpf: '', email: 'x@teste.local', telefone: '', endereco: '', observacoes: '', tipo_fornecedor: 'Roupas', catalogo: '', show_supplier_on_site: false, suplier_stars: 0 }),
    new Promise(r => setTimeout(() => r('SEM RESPOSTA em 10 s'), 10000)),
  ])
  return ok
})

// ---------- (a) duas abas do ERP: a outra vai para segundo plano e volta enquanto esta grava ----------
async function cenarioA(nomeBase = 'A') {
  // a1: volta da aba sem token vencido (caminho SIGNED_IN dentro da trava: o que travava no original)
  {
    const c = await novo(); const A = await abrirErp(c, 'A'); const B = await abrirErp(c, 'B')
    await setVisibility(B, 'hidden'); await sleep(400)
    await setVisibility(B, 'visible')          // volta: recover + SIGNED_IN com a trava segurada
    const t0 = Date.now()
    const r = await gravarFornecedor(A)        // A grava logo depois
    const postou = c.log.some(e => e.t >= t0 && e.page === 'A' && e.method === 'POST' && e.path === '/rest/v1/suppliers')
    const pr = await probe(B, 4000)
    rec(`${nomeBase}a1`, 'Duas abas ERP: aba B volta do segundo plano e, logo em seguida, aba A grava um fornecedor', r === true && postou && pr === 'respondeu',
      `gravação: ${r} | POST em suppliers: ${postou} | consulta na aba B: ${pr}`)
    await c.context.close()
  }
  // a2: volta com token vencendo e renovação de 2,5 s; a outra aba grava DURANTE a renovação
  {
    const c = await novo(); const A = await abrirErp(c, 'A'); const B = await abrirErp(c, 'B')
    await setVisibility(B, 'hidden'); await sleep(300)
    await B.evaluate(ref => { const k = `sb-${ref}-auth-token`; const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) + 5; localStorage.setItem(k, JSON.stringify(s)) }, c.ref)
    atraso.token = 2500
    await setVisibility(B, 'visible'); await sleep(150)
    const t0 = Date.now()
    const r = await gravarFornecedor(A)
    const tempo = Date.now() - t0
    atraso.token = 0
    const renovou = c.log.some(e => e.t >= t0 - 1000 && e.path === '/auth/v1/token' && e.q.includes('refresh_token'))
    rec(`${nomeBase}a2`, 'Duas abas ERP: gravação feita enquanto a outra aba renova o token (2,5 s)', r === true,
      `gravação: ${r} em ${tempo} ms | renovação de token observada: ${renovou}`)
    await c.context.close()
  }
}

// ---------- (b) cliente no site, duas abas: favoritar em uma e enviar reserva na outra ----------
async function cenarioB() {
  const rows = u => {
    if (u.pathname === '/rest/v1/clients' && u.search.includes('user_id=eq.')) return [{ id: 'cccccccc-0000-4000-8000-0000000000c1', ui_id: 7, nome: 'Cliente Teste', cpf: null, email: 'gerente@teste.local', telefone_fixo: '', celular: '11999990000', is_whatsapp: true, receber_ofertas: true, pode_provador: false, saldo_vale_presente: 0, saldo_devedor_crediario: 0, cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', data_cadastro: T, itens_pendentes_provador: 0, user_id: UID, origin: 'both' }]
    return undefined
  }
  const c = await novo({ rows }); const S1 = await openLoggedPage(c.context, c.log, c.names, 'S1', '/')
  const S2 = await openLoggedPage(c.context, c.log, c.names, 'S2', '/')
  await waitFor(() => c.log.some(e => e.page === 'S2' && e.path === '/rest/v1/products'), 20000); await sleep(1500)
  // alterna algumas vezes antes de agir
  for (let i = 0; i < 2; i++) {
    await setVisibility(S1, 'hidden'); await setVisibility(S2, 'visible'); await sleep(900)
    await setVisibility(S2, 'hidden'); await setVisibility(S1, 'visible'); await sleep(900)
  }
  const fav = await S1.evaluate(async uid => {
    const bs = await import('/src/services/backendService.ts')
    return Promise.race([bs.backendService.toggleFavorite(uid, 'aaaaaaaa-0000-4000-8000-000000000001', 'Cliente Teste', 'gerente@teste.local'), new Promise(r => setTimeout(() => r('SEM RESPOSTA em 8 s'), 8000))])
  }, UID)
  const reserva = await S2.evaluate(async uid => {
    const bs = await import('/src/services/backendService.ts')
    return Promise.race([bs.backendService.createOrderReservation({ user_id: uid, product_id: 'aaaaaaaa-0000-4000-8000-000000000001', variant_id: 'bbbbbbbb-0000-4000-8000-000000000001', quantidade: 1, status: 'pendente', nome: 'Cliente Teste', email: 'gerente@teste.local', telefone: '11999990000', observacoes: '' }), new Promise(r => setTimeout(() => r('SEM RESPOSTA em 8 s'), 8000))])
  }, UID)
  const postouFav = c.log.some(e => e.page === 'S1' && e.method === 'POST' && e.path === '/rest/v1/client_favorites')
  const postouRes = c.log.some(e => e.page === 'S2' && e.method === 'POST' && e.path === '/rest/v1/order_reservations')
  rec('Bb', 'Site, cliente logado em duas abas: favoritar na aba 1 e enviar reserva na aba 2, depois de alternar', fav === true && reserva === true && postouFav && postouRes,
    `favoritar (S1): ${fav} | POST client_favorites: ${postouFav} | reserva (S2): ${reserva} | POST order_reservations: ${postouRes}`)
  await c.context.close()
}

// ---------- (c) login em uma aba com a outra parada na tela de login ----------
async function cenarioC() {
  const log = []; const names = new Map()
  const context = await browser.newContext()
  await installMocks(context, log, names)
  await retardar(context)
  const B = await context.newPage(); names.set(B, 'B')
  await B.goto(BASE + '/erp/login', { waitUntil: 'domcontentloaded' })
  await sleep(1500)
  const A = await context.newPage(); names.set(A, 'A')
  await A.goto(BASE + '/erp/login', { waitUntil: 'domcontentloaded' })
  await A.locator('input[type="email"]').fill('gerente@teste.local')
  await A.locator('input[type="password"]').fill('senha-de-teste')
  await A.locator('button[type="submit"]').click()
  const entrouA = await waitFor(() => A.url().endsWith('/erp/home'), 12000)
  await sleep(2000)
  const sessaoB = await B.evaluate(async () => { const m = await import('/src/services/supabaseClient.ts'); const { data } = await m.supabase.auth.getSession(); return !!data.session })
  const urlB = new URL(B.url()).pathname
  const pr = await probe(B, 4000)
  // A aba B enxerga a sessão e responde, mas continua na tela de login: o redirecionamento automático
  // da tela de login está fora do escopo do card (ele exclui mudanças no fluxo de login).
  rec('Bc', 'Login na aba A com a aba B parada no login: a aba B passa a enxergar a sessão e continua respondendo', sessaoB && pr === 'respondeu',
    `aba A entrou no ERP: ${entrouA} | sessão vista pela aba B: ${sessaoB} | URL da aba B: ${urlB} | consulta na B: ${pr}`)
  await context.close()
}

// ---------- (d) volta para a aba com o perfil demorando 4 s ----------
async function cenarioD() {
  const c = await novo(); const A = await abrirErp(c, 'A')
  await setVisibility(A, 'hidden'); await sleep(300)
  atraso.profiles = 4000
  const t = Date.now()
  await setVisibility(A, 'visible')
  await sleep(1000)
  const pr1 = await probe(A, 2500)
  const tempoProbe = Date.now() - t
  const rest1 = c.log.filter(e => e.t >= t && e.page === 'A' && e.path.startsWith('/rest/v1/') && e.path !== '/rest/v1/profiles').length
  const estaNaTela = await A.evaluate(() => document.body && document.body.innerText.length > 0)
  await sleep(4500)
  atraso.profiles = 0
  const pr2 = await probe(A, 4000)
  const perfilChegou = c.log.some(e => e.t >= t && e.page === 'A' && e.path === '/rest/v1/profiles')
  rec('Bd', 'Volta para a aba com o perfil demorando 4 s: a tela segue utilizável durante a espera e nada trava', pr1 === 'respondeu' && tempoProbe < 2000 && rest1 > 0 && estaNaTela && pr2 === 'respondeu' && A.url().endsWith('/erp/home'),
    `consulta durante a espera: ${pr1} (em ${tempoProbe} ms) | outras requisições REST na espera: ${rest1} | página com conteúdo: ${estaNaTela} | consulta depois: ${pr2} | leitura de perfil feita: ${perfilChegou} | página: ${new URL(A.url()).pathname}`)
  await c.context.close()
}

// ---------- (e) 20 alternâncias rápidas (50 ms) ----------
async function cenarioE() {
  const c = await novo(); const A = await abrirErp(c, 'A')
  for (let i = 0; i < 20; i++) {
    await setVisibility(A, i % 2 === 0 ? 'hidden' : 'visible')
    await sleep(50)
  }
  await setVisibility(A, 'visible')
  await sleep(6000)
  const pr = await probe(A, 5000)
  const lk = await A.evaluate(async () => { const q = await navigator.locks.query(); return { held: q.held.map(l => l.name), pending: q.pending.map(l => l.name) } })
  const travaAuth = [...lk.held, ...lk.pending].filter(n => n.includes('auth-token'))
  rec('Be', '20 alternâncias de 50 ms: nenhuma consulta fica sem resposta e a trava de sessão não fica presa', pr === 'respondeu' && travaAuth.length === 0,
    `consulta depois: ${pr} | travas de sessão retidas/pendentes: ${JSON.stringify(travaAuth)} | travas totais: held=${lk.held.length} pending=${lk.pending.length}`)
  await c.context.close()
}

if (ALVO === 'a' || ALVO === 'all') await cenarioA('A')
if (ALVO === 'b' || ALVO === 'all') await cenarioB()
if (ALVO === 'c' || ALVO === 'all') await cenarioC()
if (ALVO === 'd' || ALVO === 'all') await cenarioD()
if (ALVO === 'e' || ALVO === 'all') await cenarioE()

await browser.close()
const falhas = results.filter(r => !r.passou).length
console.log(`\nRESUMO (duas abas, base ${BASE}): ${results.length - falhas} de ${results.length} verificações passaram`)
process.exit(falhas ? 1 : 0)
