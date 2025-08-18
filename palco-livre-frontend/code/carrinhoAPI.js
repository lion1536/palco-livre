// carrinhoAPI.js
const API_URL = "http://localhost:3000/carrinho";

/**
 * Adiciona um item ao carrinho
 * @param {string} token - Token JWT do usuário
 * @param {number|string} instrumentoId - ID do instrumento
 * @param {number} quantidade - Quantidade a adicionar
 */
// carrinhoAPI.js
export async function adicionarAoCarrinho(token, instrumentoId, quantidade) {
  if (!token) throw new Error("Usuário não autenticado.");

  const res = await fetch("http://localhost:3000/carrinho", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ instrumentoId, quantidade }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Erro ao adicionar ao carrinho");
  }

  return await res.json();
}

/**
 * Lista todos os itens do carrinho
 * @param {string} token - Token JWT do usuário
 */
export async function listarCarrinho(token) {
  const res = await fetch(API_URL, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Erro ao listar o carrinho: ${res.status}`);
  }
  return await res.json();
}

/**
 * Remove um item do carrinho
 * @param {string} token - Token JWT do usuário
 * @param {number|string} instrumentoId - ID do instrumento a remover
 */
export async function removerDoCarrinho(token, instrumentoId) {
  const res = await fetch(`${API_URL}/${instrumentoId}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Erro ao remover do carrinho: ${res.status}`);
  }
  return await res.json();
}

/**
 * Atualiza a quantidade de um item no carrinho
 * @param {string} token - Token JWT do usuário
 * @param {number|string} instrumentoId - ID do instrumento
 * @param {number} quantidade - Nova quantidade
 */
export async function atualizarQuantidade(token, instrumentoId, quantidade) {
  const res = await fetch(`${API_URL}/${instrumentoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ quantidade }),
  });
  if (!res.ok) {
    throw new Error(`Erro ao atualizar quantidade: ${res.status}`);
  }
  return await res.json();
}
