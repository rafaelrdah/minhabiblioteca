let minhaBiblioteca = [];
let minhasColecoes = [];
let livroEditandoStatus = null;
let visaoAtualColecaoId = null; 
let colecaoEditandoId = null; 

const LIVROS_POR_PRATELEIRA = 6;

// ==========================================
// SALVAMENTO AUTOMÁTICO
// ==========================================
function carregarDados() {
  const bibliotecaSalva = localStorage.getItem('minhaBiblioteca');
  const colecoesSalvas = localStorage.getItem('minhasColecoes');
  if (bibliotecaSalva) minhaBiblioteca = JSON.parse(bibliotecaSalva);
  if (colecoesSalvas) minhasColecoes = JSON.parse(colecoesSalvas);
}

function salvarDados() {
  localStorage.setItem('minhaBiblioteca', JSON.stringify(minhaBiblioteca));
  localStorage.setItem('minhasColecoes', JSON.stringify(minhasColecoes));
}

// ==========================================
// AVISOS E MODAIS
// ==========================================
function mostrarAviso(mensagem) {
  const caixa = document.getElementById('aviso-tela');
  caixa.innerText = mensagem;
  caixa.classList.remove('oculto');
  setTimeout(() => { caixa.classList.add('oculto'); }, 3000);
}

function fecharModal(idModal) {
  document.getElementById(idModal).classList.add('oculto');
  if (idModal === 'modal-status-livro') livroEditandoStatus = null;
  if (idModal === 'modal-editar-colecao') colecaoEditandoId = null;
}

// ==========================================
// LIVROS: ADICIONAR E APAGAR
// ==========================================
function abrirModalAddLivro() {
  document.getElementById('addTitulo').value = '';
  document.getElementById('addAutor').value = '';
  document.getElementById('addImagem').value = '';
  document.getElementById('modal-add-livro').classList.remove('oculto');
}

function salvarNovoLivro() {
  const titulo = document.getElementById('addTitulo').value.trim();
  const autor = document.getElementById('addAutor').value.trim();
  let imagem = document.getElementById('addImagem').value.trim();

  if (!titulo) { mostrarAviso("Digite o Título do livro!"); return; }
  if (!imagem) imagem = 'https://via.placeholder.com/130x190/2a080d/f0e6d2?text=Sem+Capa';

  const novoLivro = { id: Date.now(), titulo, autor, imagem, colecaoPertencente: visaoAtualColecaoId, status: 'nao-lido' };
  minhaBiblioteca.push(novoLivro);
  
  salvarDados();
  fecharModal('modal-add-livro');
  renderizarEstante();
  mostrarAviso(visaoAtualColecaoId ? "Adicionado à Coleção!" : "Adicionado à Estante!");
}

function apagarLivro() {
  if (confirm("Tem certeza que deseja apagar este livro da biblioteca?")) {
    minhaBiblioteca = minhaBiblioteca.filter(l => l.id !== livroEditandoStatus);
    salvarDados();
    fecharModal('modal-status-livro');
    renderizarEstante();
    mostrarAviso("Livro apagado com sucesso.");
  }
}

// ==========================================
// COLEÇÕES: CRIAR, EDITAR E APAGAR
// ==========================================
function abrirModalCriarColecao() {
  document.getElementById('nomeColecao').value = '';
  document.getElementById('imagemColecao').value = '';
  const listaHtml = document.getElementById('lista-livros-soltos');
  listaHtml.innerHTML = '';
  
  const livrosSoltos = minhaBiblioteca.filter(l => l.colecaoPertencente === null);
  if (livrosSoltos.length === 0) {
    listaHtml.innerHTML = '<p style="color: #888; font-size: 13px;">Nenhum livro solto na estante.</p>';
  } else {
    livrosSoltos.forEach(livro => {
      listaHtml.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="${livro.id}" class="check-livro-colecao">${livro.titulo}</label>`;
    });
  }
  document.getElementById('modal-criar-colecao').classList.remove('oculto');
}

function salvarNovaColecao() {
  const nome = document.getElementById('nomeColecao').value.trim();
  let imagem = document.getElementById('imagemColecao').value.trim();
  if (!nome) { mostrarAviso("A coleção precisa de um nome."); return; }
  if (!imagem) imagem = 'https://via.placeholder.com/130x190/4a0e17/f0e6d2?text=Coleção';

  const novaColecao = { id: 'col_' + Date.now(), nome, imagem };
  minhasColecoes.push(novaColecao);

  document.querySelectorAll('.check-livro-colecao:checked').forEach(box => {
    const livro = minhaBiblioteca.find(l => l.id === parseInt(box.value));
    if (livro) livro.colecaoPertencente = novaColecao.id; 
  });

  salvarDados();
  fecharModal('modal-criar-colecao');
  renderizarEstante();
  mostrarAviso("Coleção criada!");
}

function abrirModalEditarColecao(idCol) {
  colecaoEditandoId = idCol;
  const colecao = minhasColecoes.find(c => c.id === idCol);
  document.getElementById('editNomeColecao').value = colecao.nome;
  document.getElementById('editImagemColecao').value = colecao.imagem;
  
  const livrosNaColecao = minhaBiblioteca.filter(l => l.colecaoPertencente === idCol);
  const listaDentroHtml = document.getElementById('lista-livros-na-colecao');
  listaDentroHtml.innerHTML = '';
  if(livrosNaColecao.length === 0) {
    listaDentroHtml.innerHTML = '<p style="color: #888; font-size: 13px;">Nenhum livro nesta coleção.</p>';
  } else {
    livrosNaColecao.forEach(livro => {
      listaDentroHtml.innerHTML += `
        <div class="checkbox-item" style="justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 5px;">
          <span>${livro.titulo}</span>
          <button class="btn-perigo" style="padding: 6px 12px; font-size: 11px;" onclick="removerLivroDaColecaoPelaEdicao(${livro.id})">Remover</button>
        </div>`;
    });
  }

  const livrosSoltos = minhaBiblioteca.filter(l => l.colecaoPertencente === null);
  const listaSoltosHtml = document.getElementById('lista-livros-soltos-editar');
  listaSoltosHtml.innerHTML = '';
  if (livrosSoltos.length === 0) {
    listaSoltosHtml.innerHTML = '<p style="color: #888; font-size: 13px;">Nenhum livro solto na estante.</p>';
  } else {
    livrosSoltos.forEach(livro => {
      listaSoltosHtml.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="${livro.id}" class="check-livro-editar-col">${livro.titulo}</label>`;
    });
  }

  document.getElementById('modal-editar-colecao').classList.remove('oculto');
}

function removerLivroDaColecaoPelaEdicao(idLivro) {
  const livro = minhaBiblioteca.find(l => l.id === idLivro);
  if (livro) {
    livro.colecaoPertencente = null;
    salvarDados();
    abrirModalEditarColecao(colecaoEditandoId); 
    renderizarEstante(); 
    mostrarAviso("Livro removido da coleção.");
  }
}

function salvarEdicaoColecao() {
  const colecao = minhasColecoes.find(c => c.id === colecaoEditandoId);
  if (colecao) {
    colecao.nome = document.getElementById('editNomeColecao').value.trim() || colecao.nome;
    colecao.imagem = document.getElementById('editImagemColecao').value.trim() || colecao.imagem;
    
    document.querySelectorAll('.check-livro-editar-col:checked').forEach(box => {
      const livro = minhaBiblioteca.find(l => l.id === parseInt(box.value));
      if (livro) livro.colecaoPertencente = colecao.id; 
    });
  }
  
  salvarDados();
  fecharModal('modal-editar-colecao');
  renderizarEstante();
  mostrarAviso("Coleção atualizada!");
}

function apagarColecao() {
  if (confirm("Deseja apagar esta coleção? Os livros dentro dela voltarão para a estante principal.")) {
    minhaBiblioteca.forEach(l => { if(l.colecaoPertencente === colecaoEditandoId) l.colecaoPertencente = null; });
    minhasColecoes = minhasColecoes.filter(c => c.id !== colecaoEditandoId);
    
    salvarDados();
    fecharModal('modal-editar-colecao');
    if(visaoAtualColecaoId === colecaoEditandoId) visaoAtualColecaoId = null;
    
    renderizarEstante();
    mostrarAviso("Coleção apagada.");
  }
}

// ==========================================
// EDIÇÃO E STATUS DO LIVRO
// ==========================================
function abrirModalStatus(idLivro) {
  const livro = minhaBiblioteca.find(l => l.id === idLivro);
  if (!livro) return;

  livroEditandoStatus = livro.id;
  document.getElementById('img-status-livro').src = livro.imagem;
  document.getElementById('editTituloLivro').value = livro.titulo;
  document.getElementById('editAutorLivro').value = livro.autor || '';
  document.getElementById('editImagemLivro').value = livro.imagem;
  document.getElementById('select-status-livro').value = livro.status;

  const btnSairCol = document.getElementById('btn-remover-da-colecao');
  if(livro.colecaoPertencente) btnSairCol.classList.remove('oculto');
  else btnSairCol.classList.add('oculto');

  document.getElementById('modal-status-livro').classList.remove('oculto');
}

function removerLivroDaColecaoPeloLivro() {
  const livro = minhaBiblioteca.find(l => l.id === livroEditandoStatus);
  if (livro) {
    livro.colecaoPertencente = null;
    salvarDados();
    fecharModal('modal-status-livro');
    renderizarEstante();
    mostrarAviso("Livro voltou para a estante.");
  }
}

function salvarStatusLivro() {
  if (!livroEditandoStatus) return;
  const livro = minhaBiblioteca.find(l => l.id === livroEditandoStatus);
  if (livro) {
    livro.titulo = document.getElementById('editTituloLivro').value.trim() || livro.titulo;
    livro.autor = document.getElementById('editAutorLivro').value.trim() || livro.autor;
    livro.imagem = document.getElementById('editImagemLivro').value.trim() || livro.imagem;
    livro.status = document.getElementById('select-status-livro').value;
  }
  
  salvarDados();
  fecharModal('modal-status-livro');
  renderizarEstante();
  mostrarAviso("Livro atualizado!");
}

// ==========================================
// RENDERIZAÇÃO DA ESTANTE
// ==========================================
function fatiarArray(array, tamanho) {
  const fatiado = [];
  for (let i = 0; i < array.length; i += tamanho) fatiado.push(array.slice(i, i + tamanho));
  return fatiado;
}

function fecharColecaoAtual() { visaoAtualColecaoId = null; renderizarEstante(); }
function abrirColecao(idColecao) { visaoAtualColecaoId = idColecao; renderizarEstante(); }

function gerarBotaoVoltarInline() {
  const btn = document.createElement('div');
  btn.className = 'btn-voltar-inline';
  btn.onclick = fecharColecaoAtual;
  // SVG de uma seta simples
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5"></path>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  `;
  return btn;
}

function renderizarEstante() {
  const container = document.getElementById('container-estantes');
  container.innerHTML = ''; 
  let itensParaExibir = [];

  if (visaoAtualColecaoId) {
    // Adiciona o botão voltar compacto como o PRIMEIRO item da prateleira
    itensParaExibir.push({ tipo: 'botao_voltar' });
    
    const livrosDaColecao = minhaBiblioteca.filter(l => l.colecaoPertencente === visaoAtualColecaoId);
    livrosDaColecao.forEach(l => itensParaExibir.push({ tipo: 'livro', dados: l }));
  } else {
    minhasColecoes.forEach(c => itensParaExibir.push({ tipo: 'colecao', dados: c }));
    const livrosSoltos = minhaBiblioteca.filter(l => l.colecaoPertencente === null);
    livrosSoltos.forEach(l => itensParaExibir.push({ tipo: 'livro', dados: l }));
  }

  const gruposDePrateleira = fatiarArray(itensParaExibir, LIVROS_POR_PRATELEIRA);

  if (gruposDePrateleira.length === 0) {
    const divVazia = document.createElement('div');
    divVazia.className = 'prateleira';
    container.appendChild(divVazia);
  } else {
    gruposDePrateleira.forEach(grupo => {
      const prateleiraHtml = document.createElement('div');
      prateleiraHtml.className = 'prateleira';

      grupo.forEach(item => {
        if (item.tipo === 'botao_voltar') prateleiraHtml.appendChild(gerarBotaoVoltarInline());
        else if (item.tipo === 'colecao') prateleiraHtml.appendChild(gerarElementoLivro(item.dados, true));
        else prateleiraHtml.appendChild(gerarElementoLivro(item.dados, false));
      });

      container.appendChild(prateleiraHtml);
    });
  }
}

function formatarStatus(status) {
  if (status === 'lido') return 'Lido';
  if (status === 'lendo') return 'Lendo';
  return 'Não Lido';
}

function gerarElementoLivro(livro, isColecao = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'livro-wrapper';
  
  if (isColecao) wrapper.onclick = () => abrirColecao(livro.id);
  else wrapper.onclick = () => abrirModalStatus(livro.id);

  let htmlExtras = '';
  if (isColecao) {
    const iconeLapis = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    htmlExtras = `<div class="btn-editar-lapiz" onclick="event.stopPropagation(); abrirModalEditarColecao('${livro.id}')">${iconeLapis}</div>`;
  } else {
    htmlExtras = `<div class="status-badge status-${livro.status}">${formatarStatus(livro.status)}</div>`;
  }

  const textoTitulo = isColecao ? `${livro.nome}` : livro.titulo;
  const estiloAnimacao = textoTitulo.length > 15 ? "animation: vaiEVolta 6s ease-in-out infinite alternate;" : "";

  wrapper.innerHTML = `
    ${htmlExtras}
    <img src="${livro.imagem}" alt="Capa" class="livro-capa ${isColecao ? 'capa-colecao' : ''}">
    <div class="livro-titulo-container">
      <span class="livro-titulo-texto" style="${estiloAnimacao}">${textoTitulo}</span>
    </div>
  `;

  return wrapper;
}

// ==========================================
// INSTALAÇÃO DO PWA (APP NO CELULAR)
// ==========================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('Erro no Service Worker:', err));
}

// Inicializa a página
carregarDados();
renderizarEstante();
