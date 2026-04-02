let minhaBiblioteca = [];
let minhasColecoes = [];
let livroEditandoStatus = null;
let visaoAtualColecaoId = null; 
let colecaoEditandoId = null; 

const LIVROS_POR_PRATELEIRA = 6;

// ==========================================
// SISTEMA DE SALVAMENTO (LOCAL STORAGE)
// ==========================================
// Carrega os dados salvos no navegador quando a página abre
function carregarDados() {
  const bibliotecaSalva = localStorage.getItem('minhaBiblioteca');
  const colecoesSalvas = localStorage.getItem('minhasColecoes');

  if (bibliotecaSalva) {
    minhaBiblioteca = JSON.parse(bibliotecaSalva);
  }
  if (colecoesSalvas) {
    minhasColecoes = JSON.parse(colecoesSalvas);
  }
}

// Salva os dados no navegador toda vez que algo muda
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
// ADICIONAR LIVRO
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

  const novoLivro = { 
    id: Date.now(), titulo, autor, imagem, 
    colecaoPertencente: visaoAtualColecaoId, 
    status: 'nao-lido' 
  };
  
  minhaBiblioteca.push(novoLivro);
  
  salvarDados(); // Salva a alteração
  fecharModal('modal-add-livro');
  renderizarEstante();
  mostrarAviso(visaoAtualColecaoId ? "Adicionado à Coleção!" : "Adicionado à Estante!");
}

// ==========================================
// CRIAR E EDITAR COLEÇÕES
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
      listaHtml.innerHTML += `
        <label class="checkbox-item"><input type="checkbox" value="${livro.id}" class="check-livro-colecao">${livro.titulo}</label>`;
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

  salvarDados(); // Salva a alteração
  fecharModal('modal-criar-colecao');
  renderizarEstante();
  mostrarAviso("Coleção criada!");
}

function abrirModalEditarColecao(idCol) {
  colecaoEditandoId = idCol;
  const colecao = minhasColecoes.find(c => c.id === idCol);
  
  document.getElementById('editNomeColecao').value = colecao.nome;
  document.getElementById('editImagemColecao').value = colecao.imagem;
  
  const listaHtml = document.getElementById('lista-livros-soltos-editar');
  listaHtml.innerHTML = '';
  
  const livrosSoltos = minhaBiblioteca.filter(l => l.colecaoPertencente === null);
  if (livrosSoltos.length === 0) {
    listaHtml.innerHTML = '<p style="color: #888; font-size: 13px;">Todos os seus livros já estão em coleções.</p>';
  } else {
    livrosSoltos.forEach(livro => {
      listaHtml.innerHTML += `
        <label class="checkbox-item"><input type="checkbox" value="${livro.id}" class="check-livro-editar-col">${livro.titulo}</label>`;
    });
  }
  document.getElementById('modal-editar-colecao').classList.remove('oculto');
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
  
  salvarDados(); // Salva a alteração
  fecharModal('modal-editar-colecao');
  renderizarEstante();
  mostrarAviso("Coleção atualizada!");
}

// ==========================================
// EDITAR LIVRO (STATUS E DADOS)
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

  document.getElementById('modal-status-livro').classList.remove('oculto');
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

  salvarDados(); // Salva a alteração
  fecharModal('modal-status-livro');
  renderizarEstante();
  mostrarAviso("Livro atualizado!");
}

// ==========================================
// RENDERIZAÇÃO INTELIGENTE
// ==========================================
function fatiarArray(array, tamanho) {
  const fatiado = [];
  for (let i = 0; i < array.length; i += tamanho) {
    fatiado.push(array.slice(i, i + tamanho));
  }
  return fatiado;
}

function renderizarEstante() {
  const container = document.getElementById('container-estantes');
  container.innerHTML = ''; 
  let itensParaExibir = [];

  if (visaoAtualColecaoId) {
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
    return;
  }

  gruposDePrateleira.forEach(grupo => {
    const prateleiraHtml = document.createElement('div');
    prateleiraHtml.className = 'prateleira';

    grupo.forEach(item => {
      if (item.tipo === 'botao_voltar') prateleiraHtml.appendChild(gerarBotaoVoltar());
      else if (item.tipo === 'colecao') prateleiraHtml.appendChild(gerarElementoLivro(item.dados, true));
      else prateleiraHtml.appendChild(gerarElementoLivro(item.dados, false));
    });

    container.appendChild(prateleiraHtml);
  });
}

function fecharColecaoAtual() {
  visaoAtualColecaoId = null;
  renderizarEstante();
}

function abrirColecao(idColecao) {
  visaoAtualColecaoId = idColecao;
  renderizarEstante();
}

function formatarStatus(status) {
  if (status === 'lido') return 'Lido';
  if (status === 'lendo') return 'Lendo';
  return 'Não Lido';
}

function gerarBotaoVoltar() {
  const wrapper = document.createElement('div');
  wrapper.className = 'livro-wrapper';
  wrapper.onclick = fecharColecaoAtual;
  wrapper.innerHTML = `
    <div class="cartao-voltar"><span>↩</span> Voltar</div>
    <div class="livro-titulo-container"><span class="livro-titulo-texto">Fechar</span></div>`;
  return wrapper;
}

function gerarElementoLivro(livro, isColecao = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'livro-wrapper';
  
  if (isColecao) {
    wrapper.onclick = () => abrirColecao(livro.id);
  } else {
    wrapper.onclick = () => abrirModalStatus(livro.id);
  }

  let htmlExtras = '';
  if (isColecao) {
    const iconeLapis = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    `;
    
    htmlExtras = `
      <div class="btn-editar-lapiz" onclick="event.stopPropagation(); abrirModalEditarColecao('${livro.id}')">
        ${iconeLapis}
      </div>
    `;
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
// INICIALIZAÇÃO
// ==========================================
// Executa ao abrir a página: Carrega os dados salvos e desenha a estante
carregarDados();
renderizarEstante();
