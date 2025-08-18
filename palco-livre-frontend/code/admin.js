import { adicionarAoCarrinho } from "./carrinho.js";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const container = document.getElementById("container");
  const inputNome = document.getElementById("input-nome");
  const btnBuscar = document.getElementById("btn-buscar");
  const relacionados = document.getElementById("relacionados");
  const botoesCategoria = document.querySelectorAll(".filtro");
  const botoesPreco = document.querySelectorAll(".filtro-preco");

  if (!container || !inputNome || !btnBuscar || !relacionados) {
    console.error("Um ou mais elementos obrigatórios não encontrados no DOM!");
    return;
  }

  let filtroCategoria = null;
  let filtroPreco = null;
  let instrumentos = [];

  // Função para buscar instrumentos do backend
  async function carregarInstrumentos() {
    try {
      const res = await fetch("http://localhost:3000/instrumentos", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      instrumentos = await res.json();
      renderInstrumentos(instrumentos);
      relacionados.textContent = "Todos os instrumentos:";
    } catch (err) {
      console.error("Erro ao carregar instrumentos:", err);
      container.innerHTML =
        '<p class="nenhum">Erro ao carregar instrumentos do servidor.</p>';
    }
  }

  function renderInstrumentos(lista) {
    container.innerHTML = "";
    if (!lista.length) {
      container.innerHTML =
        '<p class="nenhum">Nenhum instrumento encontrado.</p>';
      return;
    }

    lista.forEach((item) => {
      const imgSrc = item.imagem_principal
        ? `http://localhost:3000/uploads/${item.imagem_principal}`
        : "../images/default-profile.png";

      const div = document.createElement("div");
      div.classList.add("card-instrumento");
      div.innerHTML = `
        <img src="${imgSrc}" alt="${item.nome}" class="img-instrumento"/>
        <div class="info">
          <h3>${item.nome}</h3>
          <p>Categoria: ${item.categoria}</p>
          <p>Preço: R$ ${Number(item.preco).toFixed(2)}</p>
          <p>Estoque: ${item.estoque != null ? item.estoque : "N/A"}</p>
        </div>
        <button class="btn-adicionar" data-id="${
          item.instrumento_id
        }">Adicionar ao Carrinho</button>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-adicionar").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const instrumentoId = btn.dataset.id;
        try {
          await adicionarAoCarrinho(token, instrumentoId, 1);
          alert("Item adicionado ao carrinho!");
        } catch (err) {
          alert("Erro ao adicionar ao carrinho: " + err.message);
        }
      });
    });
  }

  function filtrarInstrumentos() {
    const termo = inputNome.value.toLowerCase();

    const filtrados = instrumentos.filter((item) => {
      const correspondeNome = item.nome.toLowerCase().includes(termo);
      const correspondeCategoria = filtroCategoria
        ? item.categoria === filtroCategoria
        : true;
      const correspondePreco = filtroPreco
        ? item.preco >= filtroPreco.min && item.preco <= filtroPreco.max
        : true;
      return correspondeNome && correspondeCategoria && correspondePreco;
    });

    renderInstrumentos(filtrados);

    const filtrosAplicados = [
      termo || null,
      filtroCategoria || null,
      filtroPreco ? `${filtroPreco.min}-${filtroPreco.max}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    relacionados.textContent = filtrosAplicados
      ? `Resultados relacionados a: ${filtrosAplicados}`
      : "Todos os instrumentos:";
  }

  // Eventos
  btnBuscar.addEventListener("click", filtrarInstrumentos);
  inputNome.addEventListener("keyup", (e) => {
    if (e.key === "Enter") filtrarInstrumentos();
  });

  botoesCategoria.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtroCategoria =
        filtroCategoria === btn.dataset.categoria
          ? null
          : btn.dataset.categoria;
      botoesCategoria.forEach((b) =>
        b.classList.toggle("ativo", b.dataset.categoria === filtroCategoria)
      );
      filtrarInstrumentos();
    });
  });

  botoesPreco.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtroPreco =
        filtroPreco &&
        filtroPreco.min === Number(btn.dataset.precoMin) &&
        filtroPreco.max === Number(btn.dataset.precoMax)
          ? null
          : {
              min: Number(btn.dataset.precoMin),
              max: Number(btn.dataset.precoMax),
            };
      botoesPreco.forEach((b) => b.classList.toggle("ativo", b === btn));
      filtrarInstrumentos();
    });
  });

  // Inicializa
  carregarInstrumentos();
});
