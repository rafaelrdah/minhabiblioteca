let minhaBiblioteca = [];
let minhasColecoes = [];
let livroEditandoStatus = null;
let colecaoEditandoId = null; 
let colecoesExpandidas = []; 

const LIVROS_POR_PRATELEIRA = 6;

// ==========================================
// SALVAMENTO, BACKUP E PROCESSAMENTO DE IMAGEM
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

function exportarDados() {
  const dados = {
    biblioteca: minhaBiblioteca,
    colecoes: minhasColecoes
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dados));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  const dataHoje = new Date().toISOString().slice(0, 10);
  downloadAnchorNode.setAttribute("download", `biblioteca_backup_${dataHoje}.json`);
  document.body.appendChild(downloadAnchorNode); 
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  
  mostrarAviso("Backup exportado para o seu celular!");
  fecharModal('modal-backup');
}

function acionarImportacao() {
  document.getElementById('fileImportar').click();
}

function importarDados(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      if (dados.biblioteca && dados.colecoes) {
        minhaBiblioteca = dados.biblioteca;
        minhasColecoes = dados.colecoes;
        salvarDados();
        renderizarEstante();
        mostrarAviso("Backup restaurado com sucesso!");
        fecharModal('modal-backup');
      } else {
        mostrarAviso("Arquivo de backup inválido.");
      }
    } catch(err) {
      mostrarAviso("Erro ao ler o arquivo.");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function processarUploadImagem(event, inputIdTarget, imgPreviewId = null) {
  const file = event.target.files[0];
  if (!file) return;

  mostrarAviso("Processando imagem...");

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 300; 
      const MAX_HEIGHT = 450;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById(inputIdTarget).value = dataUrl;
      
      if (imgPreviewId) document.getElementById(imgPreviewId).src = dataUrl;
      
      mostrarAviso("Capa carregada com sucesso!");
    }
    img.src = e.target.result;
  }
  reader.readAsDataURL(file);
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

function abrirModalBackup() {
  document.getElementById('modal-backup').classList.remove('oculto');
}

// ==========================================
// BUSCA NA WEB
// ==========================================
async function buscarLivroWeb() {
  const inputBusca = document.getElementById('buscaWebInput');
  const query = inputBusca.value.trim();
  const container = document.getElementById('resultados-busca');
  
  if (!query) { mostrarAviso("Digite o nome ou ISBN do livro para buscar."); return; }

  container.innerHTML = '<p style="text-align:center; font-size:12px; color:#aaa; padding: 10px 0;">Buscando...</p>';
  container.classList.remove('oculto');

  let resultadosMisturados = [];

  const promessaGoogle = fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=pt&maxResults=10`)
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

  const promessaOpenLib = fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`)
    .then(res => res.json())
    .then(data => {
      if (data.docs) {
        return data.docs.map(doc => {
          let imagem = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '';
          return { titulo: doc.title || 'Sem título', autor: doc.author_name ? doc.author_name.join(', ') : 'Desconhecido', imagem: imagem, origem: 'Open Lib' };
        });
      }
      return [];
    }).catch(() => []);

  try {
    const respostas = await Promise.allSettled([promessaGoogle, promessaOpenLib]);

    if (respostas[0].status === 'fulfilled') resultadosMisturados = resultadosMisturados.concat(respostas[0].value);
    if (respostas[1].status === 'fulfilled') resultadosMisturados = resultadosMisturados.concat(respostas[1].value);

    if (resultadosMisturados.length === 0) {
      container.innerHTML = '<p style="text-align:center; font-size:12px; color:#aaa; padding: 10px 0;">Nenhum livro encontrado.</p>';
      return;
    }

    container.innerHTML = ''; 

    resultadosMisturados.forEach(livro => {
      const div = document.createElement('div');
      div.className = 'item-resultado-busca';
      div.innerHTML = `
        <img src="${livro.imagem || 'https://via.placeholder.com/40x60/2a080d/f0e6d2?text=Sem+Capa'}" alt="Capa" onerror="this.src='https://via.placeholder.com/40x60/2a080d/f0e6d2?text=Sem+Capa'">
        <div class="info-resultado">
          <div class="titulo-res">${livro.titulo} <span style="font-size: 8px; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; margin-left: 5px; color: #ccc;">${livro.origem}</span></div>
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
    container.innerHTML = '<p style="color:#ff4d4d; font-size:12px; text-align:center; padding: 10px 0;">Erro ao buscar na internet.</p>';
  }
}

// ==========================================
// LIVROS E COLEÇÕES: CRUD
// ==========================================
function abrirModalAddLivro() {
  document.getElementById('addTitulo').value = '';
  document.getElementById('addAutor').value = '';
  document.getElementById('addImagem').value = '';
  document.getElementById('fileAddLivro').value = ''; 
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

  const novoLivro = { id: Date.now(), titulo, autor, imagem, colecaoPertencente: null, status: 'nao-lido' };
  minhaBiblioteca.push(novoLivro);
  salvarDados(); fecharModal('modal-add-livro'); renderizarEstante();
  mostrarAviso("Adicionado à Estante!");
}

function apagarLivro() {
  if (confirm("Tem certeza que deseja apagar este livro da biblioteca?")) {
    minhaBiblioteca = minhaBiblioteca.filter(l => l.id !== livroEditandoStatus);
    salvarDados(); fecharModal('modal-status-livro'); renderizarEstante();
    mostrarAviso("Livro apagado com sucesso.");
  }
}

function abrirModalCriarColecao() {
  document.getElementById('nomeColecao').value = '';
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
  if (!nome) { mostrarAviso("A coleção precisa de um nome."); return; }

  const novaColecao = { id: 'col_' + Date.now(), nome };
  minhasColecoes.push(novaColecao);

  document.querySelectorAll('.check-livro-colecao:checked').forEach(box => {
    const livro = minhaBiblioteca.find(l => l.id === parseInt(box.value));
    if (livro) livro.colecaoPertencente = novaColecao.id; 
  });
  salvarDados(); fecharModal('modal-criar-colecao'); renderizarEstante();
  mostrarAviso("Coleção criada!");
}

function abrirModalEditarColecao(idCol) {
  colecaoEditandoId = idCol;
  const colecao = minhasColecoes.find(c => c.id === idCol);
  document.getElementById('editNomeColecao').value = colecao.nome;
  
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
    salvarDados(); abrirModalEditarColecao(colecaoEditandoId); renderizarEstante(); 
    mostrarAviso("Livro removido da coleção.");
  }
}

function salvarEdicaoColecao() {
  const colecao = minhasColecoes.find(c => c.id === colecaoEditandoId);
  if (colecao) {
    colecao.nome = document.getElementById('editNomeColecao').value.trim() || colecao.nome;
    document.querySelectorAll('.check-livro-editar-col:checked').forEach(box => {
      const livro = minhaBiblioteca.find(l => l.id === parseInt(box.value));
      if (livro) livro.colecaoPertencente = colecao.id; 
    });
  }
  salvarDados(); fecharModal('modal-editar-colecao'); renderizarEstante();
  mostrarAviso("Coleção atualizada!");
}

function apagarColecao() {
  if (confirm("Deseja apagar esta coleção? Os livros dentro dela voltarão para a estante principal.")) {
    minhaBiblioteca.forEach(l => { if(l.colecaoPertencente === colecaoEditandoId) l.colecaoPertencente = null; });
    minhasColecoes = minhasColecoes.filter(c => c.id !== colecaoEditandoId);
    colecoesExpandidas = colecoesExpandidas.filter(id => id !== colecaoEditandoId);
    salvarDados(); fecharModal('modal-editar-colecao'); renderizarEstante();
    mostrarAviso("Coleção apagada.");
  }
}

function abrirModalStatus(idLivro) {
  const livro = minhaBiblioteca.find(l => l.id === idLivro);
  if (!livro) return;

  livroEditandoStatus = livro.id;
  document.getElementById('img-status-livro').src = livro.imagem;
  document.getElementById('editTituloLivro').value = livro.titulo;
  document.getElementById('editAutorLivro').value = livro.autor || '';
  document.getElementById('editImagemLivro').value = livro.imagem;
  document.getElementById('fileEditLivro').value = '';
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
    salvarDados(); fecharModal('modal-status-livro'); renderizarEstante();
    mostrarAviso("Livro voltou para a estante principal.");
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
  salvarDados(); fecharModal('modal-status-livro'); renderizarEstante();
  mostrarAviso("Livro atualizado!");
}

// ==========================================
// RENDERIZAÇÃO E ORDENAÇÃO E BOLINHAS DE STATUS
// ==========================================
function fatiarArray(array, tamanho) {
  const fatiado = [];
  for (let i = 0; i < array.length; i += tamanho) fatiado.push(array.slice(i, i + tamanho));
  return fatiado;
}

function toggleColecao(idColecao) {
  if (colecoesExpandidas.includes(idColecao)) {
    colecoesExpandidas = colecoesExpandidas.filter(id => id !== idColecao);
  } else {
    colecoesExpandidas.push(idColecao);
  }
  renderizarEstante();
}

function ordenarLivrosPorStatus(livros) {
  const pesos = { 'lendo': 1, 'nao-lido': 2, 'lido': 3 };
  return livros.sort((a, b) => pesos[a.status] - pesos[b.status]);
}

// NOVO: Função que cria as bolinhas dinâmicas de status (Verde, Cinza, Carmim)
function gerarDotsStatus(livros) {
  if (!livros || livros.length === 0) return '';
  let lidos = 0, lendo = 0, naoLidos = 0;
  
  livros.forEach(l => {
    if (l.status === 'lido') lidos++;
    else if (l.status === 'lendo') lendo++;
    else naoLidos++;
  });

  let html = '<div class="status-dots-wrapper" onclick="event.stopPropagation()">'; // stopPropagation evita abrir a sanfona ao clicar na bolinha
  
  if (lidos > 0) {
    html += `<div class="dot-item" tabindex="0" data-tooltip="${lidos} Lido${lidos>1?'s':''}"><div class="circle dot-verde"></div><span class="dot-count">${lidos}</span></div>`;
  }
  if (lendo > 0) {
    html += `<div class="dot-item" tabindex="0" data-tooltip="${lendo} Lendo"><div class="circle dot-carmim"></div><span class="dot-count">${lendo}</span></div>`;
  }
  if (naoLidos > 0) {
    html += `<div class="dot-item" tabindex="0" data-tooltip="${naoLidos} Não Lido${naoLidos>1?'s':''}"><div class="circle dot-cinza"></div><span class="dot-count">${naoLidos}</span></div>`;
  }
  
  html += '</div>';
  return html;
}

function renderizarEstante() {
  const container = document.getElementById('container-estantes');
  container.innerHTML = ''; 

  // 1. ÁREA DE COLEÇÕES
  if (minhasColecoes.length > 0) {
    const secaoColecoes = document.createElement('div');
    secaoColecoes.className = 'secao-colecoes';
    secaoColecoes.innerHTML = '<h3 style="color: #aaa; font-size: 14px; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">Coleções</h3>';
    
    minhasColecoes.forEach(colecao => {
      const isExpandida = colecoesExpandidas.includes(colecao.id);
      const colBox = document.createElement('div');
      colBox.className = 'colecao-accordion-box';
      const colHeader = document.createElement('div');
      colHeader.className = 'colecao-header';
      
      const btnToggle = document.createElement('button');
      btnToggle.className = 'btn-colecao-toggle';
      btnToggle.onclick = () => toggleColecao(colecao.id);
      
      let livrosDaColecao = minhaBiblioteca.filter(l => l.colecaoPertencente === colecao.id);
      
      const rotSeta = isExpandida ? '180deg' : '0deg';
      const dotsHtml = gerarDotsStatus(livrosDaColecao); // Puxa as bolinhas com base no que tem dentro

      // Bolinhas inseridas do lado esquerdo da seta
      btnToggle.innerHTML = `
        <span style="flex:1; text-align:left; font-size:14px; font-weight:bold; display:flex; align-items:center; gap:8px;">📚 ${colecao.nome}</span>
        ${dotsHtml}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${rotSeta}); transition: transform 0.3s ease;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-colecao-editar';
      btnEdit.onclick = () => abrirModalEditarColecao(colecao.id);
      btnEdit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;

      colHeader.appendChild(btnToggle);
      colHeader.appendChild(btnEdit);
      colBox.appendChild(colHeader);

      if (isExpandida) {
        const estanteInterna = document.createElement('div');
        estanteInterna.className = 'colecao-estante-conteudo';
        
        if (livrosDaColecao.length === 0) {
          estanteInterna.innerHTML = '<div class="prateleira"><p style="color: #666; width: 100%; text-align: center; font-size: 13px; margin-bottom: 20px;">Esta coleção está vazia.</p></div>';
        } else {
          livrosDaColecao = ordenarLivrosPorStatus(livrosDaColecao);
          const grupos = fatiarArray(livrosDaColecao, LIVROS_POR_PRATELEIRA);
          grupos.forEach(grupo => {
            const prateleiraHtml = document.createElement('div');
            prateleiraHtml.className = 'prateleira';
            grupo.forEach(livro => {
              prateleiraHtml.appendChild(gerarElementoLivro(livro));
            });
            estanteInterna.appendChild(prateleiraHtml);
          });
        }
        colBox.appendChild(estanteInterna);
      }
      secaoColecoes.appendChild(colBox);
    });
    container.appendChild(secaoColecoes);
  }

  // 2. ÁREA DOS LIVROS SOLTOS
  let livrosSoltos = minhaBiblioteca.filter(l => l.colecaoPertencente === null);
  
  if (livrosSoltos.length > 0 || minhaBiblioteca.length === 0) {
    const secaoSoltos = document.createElement('div');
    secaoSoltos.className = 'secao-soltos';
    
    const dotsHtmlSoltos = gerarDotsStatus(livrosSoltos); // Bolinhas dos livros soltos

    if (minhasColecoes.length > 0) {
      secaoSoltos.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">
          <h3 style="color: #aaa; font-size: 14px; margin: 0;">Livros Soltos</h3>
          ${dotsHtmlSoltos}
        </div>
      `;
    }

    livrosSoltos = ordenarLivrosPorStatus(livrosSoltos);

    const gruposSoltos = fatiarArray(livrosSoltos, LIVROS_POR_PRATELEIRA);
    
    if (gruposSoltos.length === 0) {
      const divVazia = document.createElement('div');
      divVazia.className = 'prateleira';
      secaoSoltos.appendChild(divVazia);
    } else {
      gruposSoltos.forEach(grupo => {
        const prateleiraHtml = document.createElement('div');
        prateleiraHtml.className = 'prateleira';
        grupo.forEach(livro => {
          prateleiraHtml.appendChild(gerarElementoLivro(livro));
        });
        secaoSoltos.appendChild(prateleiraHtml);
      });
    }
    
    container.appendChild(secaoSoltos);
  }
}

function formatarStatus(status) {
  if (status === 'lido') return 'Lido';
  if (status === 'lendo') return 'Lendo';
  return 'Não Lido';
}

function gerarElementoLivro(livro) {
  const wrapper = document.createElement('div');
  wrapper.className = 'livro-wrapper';
  wrapper.onclick = () => abrirModalStatus(livro.id);

  const htmlExtras = `<div class="status-badge status-${livro.status}">${formatarStatus(livro.status)}</div>`;
  const estiloAnimacao = livro.titulo.length > 15 ? "animation: vaiEVolta 6s ease-in-out infinite alternate;" : "";

  wrapper.innerHTML = `
    ${htmlExtras}
    <img src="${livro.imagem}" alt="Capa" class="livro-capa">
    <div class="livro-titulo-container">
      <span class="livro-titulo-texto" style="${estiloAnimacao}">${livro.titulo}</span>
    </div>
  `;

  return wrapper;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('Erro no Service Worker:', err));
}

carregarDados();
renderizarEstante();
