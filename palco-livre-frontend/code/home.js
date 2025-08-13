import {
  listarCarrinho,
  adicionarAoCarrinho,
  removerDoCarrinho,
} from "./carrinho.js";

const token = localStorage.getItem("token");
const container = document.getElementById("instrumentos-container");

// Exemplo de instrumentos (você pode futuramente buscar do backend)
const instrumentos = [
  {
    id: 1,
    nome: "Saxofone Tenor",
    preco: 500,
    imagem: "../images/download.jpg",
  },
  { id: 2, nome: "Violão", preco: 1000, imagem: "../images/violao.jpg" },
];

// Renderiza instrumentos na página
instrumentos.forEach((item) => {
  const div = document.createElement("div");
  div.classList.add("instrumento");
  div.dataset.id = item.id;
  div.innerHTML = `
    <img src="${item.imagem}" alt="${item.nome}" width="150" />
    <p>${item.nome}</p>
    <p>Preço: R$ ${item.preco}</p>
    <button class="adicionar">Adicionar ao Carrinho</button>
    <button class="remover">Remover do Carrinho</button>
  `;
  container.appendChild(div);
});

// Função para mapear instrumento_id -> carrinho_id
async function pegarCarrinho() {
  try {
    const carrinho = await listarCarrinho(token);
    const map = {};
    carrinho.forEach((item) => {
      map[item.instrumento_id] = item.carrinho_id;
    });
    return map;
  } catch (err) {
    console.error("Erro ao buscar carrinho:", err);
    return {};
  }
}

// Eventos de clique nos botões de adicionar/remover
container.addEventListener("click", async (e) => {
  const target = e.target;
  const instrumentoDiv = target.closest(".instrumento");
  if (!instrumentoDiv) return;

  const instrumentoId = parseInt(instrumentoDiv.dataset.id);
  const nome = instrumentoDiv.querySelector("p").textContent;

  try {
    if (target.classList.contains("adicionar")) {
      await adicionarAoCarrinho(token, instrumentoId, 1);
      alert(`${nome} adicionado ao carrinho!`);
    }

    if (target.classList.contains("remover")) {
      const mapCarrinho = await pegarCarrinho();
      const carrinhoId = mapCarrinho[instrumentoId];
      if (!carrinhoId) {
        alert(`${nome} não está no carrinho.`);
        return;
      }
      await removerDoCarrinho(token, carrinhoId);
      alert(`${nome} removido do carrinho!`);
    }
  } catch (err) {
    alert("Erro: " + err.message);
  }
});
