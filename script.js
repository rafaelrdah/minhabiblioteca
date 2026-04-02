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
// BUSCA NA WEB (MEGAZORD: 6 APIs JUNTAS)
// ==========================================
async function buscarLivroWeb() {
  const inputBusca = document.getElementById('buscaWebInput');
  const query = inputBusca.value.trim();
  const container = document.getElementById('resultados-busca');
  
  if (!query) {
    mostrarAviso("Digite o nome ou ISBN do livro para buscar.");
    return;
  }

  container.innerHTML = '<p style="text-align:center; font-size:12px; color:#aaa; padding: 10px 0;">Buscando em todos os acervos disponíveis...</p>';
  container.classList.remove('oculto');

  let resultadosMisturados = [];
  
  // Limpa o texto para verificar se é um código ISBN válido
  const cleanQuery = query.replace(/[\s-]/g, '');
  const isISBN = /^(?:\d{9}[\dX]|\d{13})$/i.test(cleanQuery);

  // 1. Google Books (PT-BR Focus)
  const promessaGoogle = fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=pt&maxResults=5`)
    .then(res => res.json())
    .then(data => {
      if (data.items) {
        return data.items.map(item => {
          const info = item.volumeInfo;
          let imagem = info.imageLinks ? info.imageLinks.thumbnail : '';
          if (imagem) imagem = imagem.replace('http:', 'https:'); 
          return { titulo: info.title || 'Sem título', autor: info.authors ? info.authors.join(', ') : 'Desconhecido', imagem: imagem, origem: 'Google' };
        });
      }
      return [];
    }).catch(() => []);

  // 2. Open Library
  const promessaOpenLib = fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`)
    .then(res => res.json())
    .then(data => {
      if (data.docs) {
        return data.docs.map(doc => {
          let imagem = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '';
          return { titulo: doc.title || 'Sem título', autor: doc.author_name ? doc.author_name.join(', ') : 'Desconhecido', imagem: imagem, origem: 'OpenLib' };
        });
      }
      return [];
    }).catch(() => []);

  // 3. BrasilAPI (Reforço PT-BR EXCLUSIVO para ISBN)
  let promessaBrasilAPI = Promise.resolve([]);
  if (isISBN) {
    promessaBrasilAPI = fetch(`https://brasilapi.com.br/api/isbn/v1/${cleanQuery}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.title) {
          return [{ titulo: data.title, autor: data.authors ? data.authors.join(', ') : 'Desconhecido', imagem: data.cover_url || '', origem: 'BrasilAPI' }];
        }
        return [];
      }).catch(() => []); 
  }

  // 4. Gutendex (Project Gutenberg API)
  const promessaGutendex = fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (data.results) {
        return data.results.slice(0, 5).map(book => ({
          titulo: book.title, 
          autor: book.authors.map(a => a.name).join(', ') || 'Desconhecido', 
          imagem: book.formats['image/jpeg'] || '', 
          origem: 'Gutendex'
        }));
      }
      return [];
    }).catch(() => []);

  // 5. Internet Archive
  const promessaArchive = fetch(`https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(query)})&fl[]=title,creator,identifier&output=json&rows=5`)
    .then(res => res.json())
    .then(data => {
      if (data.response && data.response.docs) {
        return data.response.docs.map(doc => ({
          titulo: doc.title || 'Sem título',
          autor: doc.creator ? (Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator) : 'Desconhecido',
          imagem: doc.identifier ? `https://archive.org/services/img/${doc.identifier}` : '',
          origem: 'Archive'
        }));
      }
      return [];
    }).catch(() => []);

  // 6. WorldCat (Nota: Costuma falhar no Client-Side por CORS sem chave de API, mas se passar, vai pra lista)
  const promessaWorldCat = fetch(`https://www.worldcat.org/webservices/catalog/search/opensearch?q=${encodeURIComponent(query)}&format=json`)
    .then(res => res.json())
    .then(data => []) // Ajustar o mapeamento se o endpoint um dia for aberto
    .catch(() => []); // O catch abafa o erro vermelho do console e deixa a página viva

  try {
    // Taca tudo junto!
    const respostas = await Promise.allSettled([
      promessaGoogle, promessaOpenLib, promessaBrasilAPI, promessaGutendex, promessaArchive, promessaWorldCat
    ]);

    // Extrai quem teve sucesso e concatena na lista final
    respostas.forEach(res => {
      if (res.status === 'fulfilled' && res.value.length > 0) {
        resultadosMisturados = resultadosMisturados.concat(res.value);
      }
    });

    if (resultadosMisturados.length === 0) {
      container.innerHTML = '<p style="text-align:center; font-size:12px; color:#aaa; padding: 10px 0;">Nenhum livro encontrado nas 6 bases.</p>';
      return;
    }

    container.innerHTML = ''; 

    // Renderiza cada item encontrado
    resultadosMisturados.forEach(livro => {
      const div = document.createElement('div');
      div.className = 'item-resultado-busca';
      
      div.innerHTML = `
        <img src="${livro.imagem || 'https://via.placeholder.com/40x60/2a080d/f0e6d2?text=Sem+Capa'}" alt="Capa" onerror="this.src='https://via.placeholder.com/40x60/2a080d/f0e6d2?text=Sem+Capa'">
        <div class="info-resultado">
          <div class="titulo-res">
            ${livro.titulo} 
            <span style="font-size: 8px; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; margin-left: 5px; color: #ccc;">${livro.origem}</span>
          </div>
          <div class="autor-res">${livro.autor}</div>
        </div>
      `;
      
      div.onclick = () => {
        document.getElementById('addTitulo').value = livro.titulo;
        document.getElementById('addAutor').value = livro.autor;
        document.getElementById('addImagem').value = livro.imagem;
        
        container.classList.add('oculto');
        inputBusca.value = '';
        mostrarAviso("Dados preenchidos! Só clicar em Adicionar.");
      };
      
      container.appendChild(div);
    });

  } catch (error) {
    container.innerHTML = '<p style="color:#ff4d4d; font-size:12px; text-align:center; padding: 10px 0;">Erro interno ao processar a busca.</p>';
  }
}

// ==========================================
// LIVROS: ADICIONAR E APAGAR
// ==========================================
function abrirModalAddLivro() {
  document.getElementById('addTitulo').value = '';
  document.getElementById('addAutor').value = '';
  document.getElementById('addImagem').value = '';
  document.getElementById('buscaWebInput').value = '';
  document.getElementById('resultados-busca').classList.add('oculto');
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
