// Formulários em preenchimento sobrevivem à troca de aba? (critério de aceite 3 do card)
import { launchBrowser, installMocks, seedSession, setVisibility, waitFor } from './repro.mjs'
const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const UID = '11111111-1111-4111-8111-111111111111'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const T = '2026-01-01T00:00:00+00:00'
const mkProduct = (n, nome, estoque) => ({
  id: `aaaaaaaa-0000-4000-8000-00000000000${n}`, ui_id: n, nome, marca: 'Marca X', categoria: 'Vestidos', tipo_material: 'Malha',
  created_at: T, descricao: 'Descrição original', slug: nome.toLowerCase().replace(/\s+/g, '-'), updated_at: T, show_on_site: false,
  variants: [{ id: `bbbbbbbb-0000-4000-8000-00000000000${n}`, product_id: `aaaaaaaa-0000-4000-8000-00000000000${n}`, ui_id: n * 1000 + 1, sku: null, ean: null, cor: 'Azul', tamanho: 'M', preco_custo: 50, preco_venda: 100, quantidade_estoque: estoque, created_at: T, updated_at: T }],
  images: [],
})
const db = {
  products: [mkProduct(1, 'Vestido Teste', 3), mkProduct(2, 'Blusa Teste', 5)],
  suppliers: [
    { id: 'cccccccc-0000-4000-8000-000000000001', ui_id: 1, nome_empresa: 'Fornecedor X LTDA', fantasy_name: 'Marca X', nome_contato: 'Fulano', cnpj_cpf: '', email: 'contato@fornecedor.test', telefone: '', endereco: '', observacoes: '', created_at: T, tipo_fornecedor: 'Roupas', catalogo: '', show_supplier_on_site: false, suplier_stars: 0 },
    { id: 'cccccccc-0000-4000-8000-000000000002', ui_id: 2, nome_empresa: 'Outro Fornecedor LTDA', fantasy_name: 'Marca Y', nome_contato: 'Beltrano', cnpj_cpf: '', email: '', telefone: '', endereco: '', observacoes: '', created_at: T, tipo_fornecedor: 'Acessórios', catalogo: '', show_supplier_on_site: false, suplier_stars: 0 },
  ],
  client: { id: UID, ui_id: 7, nome: 'Cliente Teste', cpf: null, email: 'gerente@teste.local', telefone_fixo: '', celular: '11999990000', is_whatsapp: true, receber_ofertas: true, pode_provador: false, saldo_vale_presente: 0, saldo_devedor_crediario: 0, cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', data_cadastro: T, itens_pendentes_provador: 0, user_id: UID, origin: 'both' },
}
const rows = u => {
  if (u.pathname === '/rest/v1/products') return JSON.parse(JSON.stringify(db.products))
  if (u.pathname === '/rest/v1/suppliers') return JSON.parse(JSON.stringify(db.suppliers))
  if (u.pathname === '/rest/v1/clients' && u.search.includes('user_id=eq.')) return [JSON.parse(JSON.stringify(db.client))]
  return undefined
}
const results = []
const rec = (id, nome, passou, detalhe) => { results.push({ id, passou }); console.log(`${passou ? 'PASSOU' : 'FALHOU'}  ${id}  ${nome}\n        ${detalhe}`) }

const browser = await launchBrowser()
const context = await browser.newContext()
const log = []; const names = new Map()
await installMocks(context, log, names, { rows })
await seedSession(context, log, names)
const page = await context.newPage(); names.set(page, 'A')
page.on('pageerror', e => { if (!/tailwind is not defined/.test(e.message)) console.log('   [erro de página]', String(e.message).slice(0, 200)) })
page.on('dialog', d => { console.log('   [alerta do navegador]', d.message().slice(0, 120)); d.accept() })

async function voltarDaOutraAba(ms = 3500) {
  await setVisibility(page, 'hidden'); await sleep(600)
  const t = Date.now()
  await setVisibility(page, 'visible'); await sleep(ms)
  return log.filter(e => e.t >= t && e.page === 'A' && e.path.startsWith('/rest/v1/')).length
}
async function marcar(loc) { await loc.evaluate(el => { el.__marcaDoTeste = true }) }
const marcado = loc => loc.evaluate(el => el.__marcaDoTeste === true)

// ---------- F1: edição de produto ----------
await page.goto(BASE + '/erp/products/update/1', { waitUntil: 'domcontentloaded' })
const nome = page.locator('input[name="nome"]')
await nome.waitFor({ timeout: 20000 })
await waitFor(async () => (await nome.inputValue()) === 'Vestido Teste', 15000)
await sleep(1200)
await nome.fill('Vestido Editado Sem Salvar'); await marcar(nome)
let n = await voltarDaOutraAba()
let v = await nome.inputValue()
rec('F1.1', 'Edição de produto: o que foi digitado continua depois de trocar de aba e voltar', v === 'Vestido Editado Sem Salvar' && await marcado(nome), `campo Nome = "${v}" | recarga ao voltar: ${n} requisições`)

db.products[1].variants[0].quantidade_estoque = 4   // outra aba vendeu OUTRO produto enquanto esta estava em segundo plano
n = await voltarDaOutraAba()
v = await nome.inputValue()
rec('F1.2', 'Edição de produto: mudança em OUTRO produto feita por outra aba não apaga o que foi digitado', v === 'Vestido Editado Sem Salvar', `campo Nome = "${v}"`)

db.products[0].variants[0].quantidade_estoque = 2   // outra aba vendeu ESTE produto
n = await voltarDaOutraAba()
v = await nome.inputValue()
rec('F1.3', 'Edição de produto: venda DESTE produto feita por outra aba não apaga o que foi digitado', v === 'Vestido Editado Sem Salvar' && await marcado(nome), `campo Nome = "${v}"`)

// formulário aberto e ainda sem edição: acompanha o banco
await page.goto(BASE + '/erp/products/update/2', { waitUntil: 'domcontentloaded' })
await nome.waitFor({ timeout: 20000 })
await waitFor(async () => (await nome.inputValue()) === 'Blusa Teste', 15000)
await sleep(1200)
db.products[1].nome = 'Blusa Renomeada Por Outra Aba'
n = await voltarDaOutraAba()
v = await nome.inputValue()
rec('F1.4', 'Edição de produto ainda sem nenhuma alteração do usuário: ao voltar para a aba mostra o dado novo do banco', v === 'Blusa Renomeada Por Outra Aba', `campo Nome = "${v}"`)

// ---------- F2: edição de fornecedor ----------
await page.goto(BASE + '/erp/suppliers/update/1', { waitUntil: 'domcontentloaded' })
const razao = page.locator('input[placeholder="Ex: Confecções Silva Ltda"]')
await razao.waitFor({ timeout: 20000 })
await waitFor(async () => (await razao.inputValue()) === 'Fornecedor X LTDA', 15000)
await sleep(1200)
await razao.fill('Fornecedor Editado Sem Salvar LTDA'); await marcar(razao)
n = await voltarDaOutraAba()
v = await razao.inputValue()
rec('F2.1', 'Edição de fornecedor: o que foi digitado continua depois de trocar de aba e voltar', v === 'Fornecedor Editado Sem Salvar LTDA' && await marcado(razao), `campo Razão Social = "${v}" | recarga ao voltar: ${n} requisições`)

db.suppliers[1].nome_contato = 'Contato alterado por outra aba'   // outra aba editou OUTRO fornecedor
n = await voltarDaOutraAba()
v = await razao.inputValue()
rec('F2.2', 'Edição de fornecedor: mudança em OUTRO fornecedor feita por outra aba não apaga o que foi digitado', v === 'Fornecedor Editado Sem Salvar LTDA', `campo Razão Social = "${v}"`)

db.suppliers[0].telefone = '(11) 4000-0000'   // outra aba editou ESTE fornecedor
n = await voltarDaOutraAba()
v = await razao.inputValue()
rec('F2.3', 'Edição de fornecedor: mudança NESTE fornecedor feita por outra aba não apaga o que foi digitado', v === 'Fornecedor Editado Sem Salvar LTDA', `campo Razão Social = "${v}"`)

const t0 = Date.now()
await page.locator('button[type="submit"]').first().click()
const salvou = await waitFor(() => log.some(e => e.t >= t0 && e.page === 'A' && e.path === '/rest/v1/suppliers' && e.method === 'PATCH'), 8000)
const voltouParaLista = await waitFor(() => new URL(page.url()).pathname === '/erp/suppliers', 6000)
rec('F2.4', 'Edição de fornecedor: depois de voltar para a aba, salvar grava e a tela segue para a lista', salvou && voltouParaLista, `PATCH em suppliers ${salvou ? 'enviado' : 'NÃO enviado'} | página: ${new URL(page.url()).pathname}`)

// ---------- F3: perfil do funcionário ----------
await page.goto(BASE + '/erp/profile', { waitUntil: 'domcontentloaded' })
const nomePerfil = page.locator('form input[type="text"]').first()
await nomePerfil.waitFor({ timeout: 20000 })
await waitFor(async () => (await nomePerfil.inputValue()) === 'Gerente Teste', 15000)
await sleep(800)
await nomePerfil.fill('Gerente Com Nome Novo'); await marcar(nomePerfil)
n = await voltarDaOutraAba()
v = await nomePerfil.inputValue()
rec('F3.1', 'Perfil do funcionário: o que foi digitado continua depois de trocar de aba e voltar', v === 'Gerente Com Nome Novo' && await marcado(nomePerfil), `campo Nome = "${v}"`)

// ---------- F4: meus dados (site) ----------
await page.goto(BASE + '/minha-conta/meus_dados', { waitUntil: 'domcontentloaded' })
await waitFor(() => page.evaluate(() => [...document.querySelectorAll('input')].some(i => i.value === 'Cliente Teste')), 20000)
await page.evaluate(() => { [...document.querySelectorAll('input')].find(i => i.value === 'Cliente Teste').setAttribute('data-teste', 'nome-cliente') })
const nomeCliente = page.locator('input[data-teste="nome-cliente"]')
await sleep(800)
await nomeCliente.fill('Cliente Com Nome Novo'); await marcar(nomeCliente)
n = await voltarDaOutraAba()
const aindaExiste = await nomeCliente.count()
v = aindaExiste ? await nomeCliente.inputValue() : '(formulário foi desmontado)'
rec('F4.1', 'Meus dados (site): o formulário não é recarregado nem perde o que foi digitado ao voltar para a aba', aindaExiste === 1 && v === 'Cliente Com Nome Novo' && await marcado(nomeCliente), `campo Nome = "${v}"`)

// sem edição pendente: os dados alterados pela loja aparecem ao voltar, sem trocar a tela pelo carregamento
await page.goto(BASE + '/minha-conta', { waitUntil: 'domcontentloaded' }); await sleep(800)
await page.goto(BASE + '/minha-conta/meus_dados', { waitUntil: 'domcontentloaded' })
await waitFor(() => page.evaluate(() => [...document.querySelectorAll('input')].some(i => i.value === 'Cliente Teste')), 20000)
await page.evaluate(() => { [...document.querySelectorAll('input')].find(i => i.value === 'Cliente Teste').setAttribute('data-teste', 'nome-cliente-2') })
const nome2 = page.locator('input[data-teste="nome-cliente-2"]'); await marcar(nome2)
await sleep(600)
db.client.nome = 'Cliente Corrigido Pela Loja'
n = await voltarDaOutraAba()
v = (await nome2.count()) ? await nome2.inputValue() : '(formulário foi desmontado)'
rec('F4.2', 'Meus dados (site) sem edição pendente: ao voltar para a aba mostra o dado alterado pela loja, sem recarregar a tela', v === 'Cliente Corrigido Pela Loja' && await marcado(nome2), `campo Nome = "${v}"`)

await browser.close()
const falhas = results.filter(r => !r.passou).length
console.log(`\nRESUMO (formulários): ${results.length - falhas} de ${results.length} verificações passaram`)
process.exit(falhas ? 1 : 0)
