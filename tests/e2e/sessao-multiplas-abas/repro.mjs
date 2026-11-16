// Card "Conexão com o sistema cai ao abrir ou alternar entre múltiplas abas do ERP e do site".
// Reproduz o defeito e serve de biblioteca para os outros roteiros desta pasta.
// Navegador real + servidor de desenvolvimento local. TODO o tráfego para *.supabase.co é
// respondido por simulação (installMocks): nenhuma requisição chega ao projeto real.
// Uso: node repro.mjs   (BASE=http://127.0.0.1:3000 por padrão; BROWSER=chrome|firefox|webkit)
import { chromium, firefox, webkit } from 'playwright'

// Navegador do teste: BROWSER=chrome (padrão, Chrome instalado na máquina), firefox ou webkit.
export async function launchBrowser() {
  const which = process.env.BROWSER || 'chrome'
  if (which === 'firefox') return firefox.launch({ headless: true })
  if (which === 'webkit') return webkit.launch({ headless: true })
  return chromium.launch({ channel: 'chrome', headless: true })
}

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const UID = '11111111-1111-4111-8111-111111111111'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const sleep = ms => new Promise(r => setTimeout(r, ms))

function fakeSession(expiresInSec = 3600) {
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: UID, aud: 'authenticated', role: 'authenticated', email: 'gerente@teste.local', exp: now + expiresInSec, iat: now }
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.assinatura-falsa`,
    token_type: 'bearer',
    expires_in: expiresInSec,
    expires_at: now + expiresInSec,
    refresh_token: 'refresh-falso-' + now,
    user: {
      id: UID, aud: 'authenticated', role: 'authenticated', email: 'gerente@teste.local',
      email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { name: 'Gerente Teste' },
      identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  }
}

const isSupabase = url => /\.supabase\.co$/.test(new URL(url).hostname)
const isLocal = url => ['127.0.0.1', 'localhost'].includes(new URL(url).hostname)

export async function installMocks(context, log, names, opts = {}) {
  await context.route(url => !isLocal(url.toString()) && !isSupabase(url.toString()), route => route.abort())
  await context.route(url => isSupabase(url.toString()), async route => {
    const req = route.request()
    const u = new URL(req.url())
    let pg = '?'
    try { pg = names.get(req.frame().page()) || '?' } catch { /* requisição sem frame */ }
    log.push({ t: Date.now(), method: req.method(), path: u.pathname, q: u.search, page: pg, host: u.hostname })
    const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }
    const json = (status, body, extra = {}) => route.fulfill({ status, headers: { 'content-type': 'application/json', ...cors, ...extra }, body: JSON.stringify(body) })
    const delay = typeof opts.delayMs === 'function' ? opts.delayMs(u) : opts.delayMs
    if (delay) await sleep(delay)
    if (opts.intercept) {
      const r = opts.intercept(u, req)
      if (r === 'hang') return           // nunca responde (conexão morta)
      if (r) return json(r.status, r.body)
    }
    const p = u.pathname
    if (p.startsWith('/auth/v1/token')) return json(200, fakeSession())
    if (p.startsWith('/auth/v1/user')) return json(200, fakeSession().user)
    if (p.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cors })
    if (p.startsWith('/auth/v1/')) return json(200, {})
    if (p.startsWith('/storage/v1/')) return json(200, [])
    if (opts.rows && p.startsWith('/rest/v1/') && req.method() === 'GET') {
      const custom = opts.rows(u, req)
      if (custom !== undefined) return json(200, custom)
    }
    if (p === '/rest/v1/profiles' && opts.profileResponse) {
      const r = opts.profileResponse(u)
      if (r) return json(r.status, r.body)
    }
    if (p === '/rest/v1/profiles') {
      const active = opts.profileActive ? opts.profileActive() : true
      return json(200, [{ id: UID, ui_id: 1, name: 'Gerente Teste', email: 'gerente@teste.local', role: 'manager', active, created_at: '2026-01-01T00:00:00Z' }])
    }
    if (p.startsWith('/rest/v1/rpc/')) return json(200, null)
    if (p.startsWith('/rest/v1/')) {
      const accept = req.headers()['accept'] || ''
      if (req.method() === 'GET') {
        if (accept.includes('vnd.pgrst.object')) return json(406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' })
        return json(200, [], { 'content-range': '*/0' })
      }
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '*/0' } })
      return json(req.method() === 'POST' ? 201 : 200, accept.includes('vnd.pgrst.object') ? { id: '22222222-2222-4222-8222-222222222222' } : [])
    }
    return json(200, {})
  })
}

// Simula o que o navegador faz ao esconder/mostrar a aba: muda document.visibilityState e dispara visibilitychange.
export async function setVisibility(page, state) {
  await page.evaluate(s => {
    window.__vis = s
    if (!window.__visPatched) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis })
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' })
      window.__visPatched = true
    }
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
  }, state)
}

// Faz uma consulta pelo MESMO cliente Supabase da aplicação e diz se ela termina.
export async function probe(page, ms = 6000) {
  return page.evaluate(async timeout => {
    const m = await import('/src/services/supabaseClient.ts')
    const q = m.supabase.from('store_config').select('value').limit(1)
    return Promise.race([
      q.then(r => (r.error ? 'erro:' + r.error.message : 'respondeu')),
      new Promise(r => setTimeout(() => r('SEM RESPOSTA em ' + timeout / 1000 + ' s'), timeout)),
    ])
  }, ms)
}

export async function waitFor(fn, ms = 15000, step = 100) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(step) }
  return false
}

export async function openLoggedPage(context, log, names, name, path = '/erp/home') {
  const page = await context.newPage()
  names.set(page, name)
  page.on('pageerror', e => console.log(`   [${name}] erro de página: ${String(e.message).slice(0, 160)}`))
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  return page
}

export async function seedSession(context, log, names, expiresInSec = 3600) {
  // 1ª visita sem sessão: descobre o host do projeto a partir da 1ª requisição (não lê o .env)
  const page = await context.newPage()
  names.set(page, 'seed')
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  // O host vem de uma chamada à API (/rest/v1): os banners têm URL fixa de Storage e não servem de referência
  const isApi = e => e.path.startsWith('/rest/v1/')
  const ok = await waitFor(() => log.some(isApi), 20000)
  if (!ok) throw new Error('a aplicação não fez nenhuma requisição à API do Supabase na carga inicial')
  const ref = log.find(isApi).host.split('.')[0]
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(fakeSession(expiresInSec))])
  await page.close()
  return ref
}

const since = (log, t, page) => log.filter(e => e.t >= t && e.page === page && e.path.startsWith('/rest/v1/'))

async function main() {
  const browser = await launchBrowser()
  const results = []
  const rec = (id, nome, passou, detalhe) => { results.push({ id, nome, passou, detalhe }); console.log(`${passou ? 'PASSOU' : 'FALHOU'}  ${id}  ${nome}\n        ${detalhe}`) }

  // ---------- Cenário 1: uma aba, usuário logado, vai para segundo plano e volta ----------
  {
    const context = await browser.newContext()
    const log = []; const names = new Map()
    await installMocks(context, log, names)
    await seedSession(context, log, names)
    const A = await openLoggedPage(context, log, names, 'A')
    const carregou = await waitFor(() => log.some(e => e.page === 'A' && e.path === '/rest/v1/stock_entries'), 20000)
    await sleep(1500)
    const locks = await A.evaluate(() => !!navigator.locks)
    console.log(`   aba A carregou o ERP: ${carregou} | navigator.locks disponível: ${locks} | requisições REST na carga: ${since(log, 0, 'A').length}`)
    const antes = await probe(A)
    rec('C1.0', 'Antes de trocar de aba, uma consulta responde', antes === 'respondeu', `consulta: ${antes}`)

    await setVisibility(A, 'hidden'); await sleep(800)
    const tVolta = Date.now()
    await setVisibility(A, 'visible'); await sleep(4000)
    const reqs = since(log, tVolta, 'A').length
    rec('C1.1', 'Ao voltar para a aba, a aplicação volta a buscar dados', reqs > 0, `requisições REST nos 4 s após voltar: ${reqs}`)
    const depois = await probe(A)
    rec('C1.2', 'Depois de voltar para a aba, uma consulta responde sem F5', depois === 'respondeu', `consulta: ${depois}`)

    // ---------- Cenário 2: segunda aba aberta enquanto a primeira já voltou do segundo plano ----------
    const tB = Date.now()
    const B = await openLoggedPage(context, log, names, 'B')
    await sleep(6000)
    const reqsB = since(log, tB, 'B').length
    rec('C2.1', 'Uma segunda aba aberta em seguida carrega os dados', reqsB > 0, `requisições REST da aba B em 6 s: ${reqsB}`)
    const probeB = await probe(B)
    rec('C2.2', 'Na segunda aba, uma consulta responde', probeB === 'respondeu', `consulta: ${probeB}`)
    await context.close()
  }

  // ---------- Cenário 3: site sem login (controle) ----------
  {
    const context = await browser.newContext()
    const log = []; const names = new Map()
    await installMocks(context, log, names)
    const S = await context.newPage(); names.set(S, 'S')
    await S.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await waitFor(() => log.some(e => e.page === 'S' && e.path === '/rest/v1/products'), 20000)
    await sleep(1000)
    await setVisibility(S, 'hidden'); await sleep(500); await setVisibility(S, 'visible'); await sleep(2500)
    const r = await probe(S)
    rec('C3.1', 'Visitante sem login: consulta responde depois de trocar de aba (controle)', r === 'respondeu', `consulta: ${r}`)
    await context.close()
  }

  await browser.close()
  const falhas = results.filter(r => !r.passou).length
  console.log(`\nRESUMO: ${results.length - falhas} de ${results.length} verificações passaram`)
  process.exit(falhas ? 1 : 0)
}

if (process.argv[1] && process.argv[1].endsWith('repro.mjs')) main().catch(e => { console.error('ERRO DO HARNESS:', e); process.exit(2) })
