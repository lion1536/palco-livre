const BASE_URL = "http://localhost:3000";

// Listar itens do carrinho
export async function listarCarrinho(token) {
  try {
    const res = await fetch(`${BASE_URL}/carrinho`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Erro ao listar carrinho");
    const data = await res.json();
    return data.carrinho || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Adicionar item ao carrinho
export async function adicionarAoCarrinho(
  token,
  instrumentoId,
  quantidade = 1
) {
  try {
    const res = await fetch(`${BASE_URL}/carrinho`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ instrumentoId, quantidade }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao adicionar item");
    }
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// Remover item do carrinho
export async function removerDoCarrinho(token, carrinhoId) {
  try {
    const res = await fetch(`${BASE_URL}/carrinho/${carrinhoId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao remover item");
    }
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}
