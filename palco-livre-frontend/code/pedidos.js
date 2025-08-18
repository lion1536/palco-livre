const API_URL = "http://localhost:3000";
const pedidosContainer = document.getElementById("pedidosContainer");
const btnLogout = document.getElementById("btnLogout");
const token = localStorage.getItem("token");

if (!token) window.location.href = "login.html";

// Logout
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// -------------------------
// Carregar pedidos do usuário/admin
export async function carregarPedidos() {
  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao listar pedidos");
    const pedidos = await res.json();
    renderPedidos(pedidos);
  } catch (err) {
    console.error(err);
    pedidosContainer.innerHTML =
      "<p>Erro ao carregar pedidos. Tente novamente.</p>";
  }
}

// -------------------------
// Renderizar pedidos
function renderPedidos(pedidos) {
  pedidosContainer.innerHTML = "";
  if (!pedidos.length) {
    pedidosContainer.innerHTML = "<p>Você ainda não fez nenhum pedido.</p>";
    return;
  }

  pedidos.forEach((pedido) => {
    const div = document.createElement("div");
    div.classList.add("pedido-card");

    let itensHTML = "";
    if (pedido.itens && pedido.itens.length) {
      itensHTML =
        "<ul>" +
        pedido.itens
          .map(
            (i) =>
              `<li>${i.nome} x${i.quantidade} - R$ ${Number(i.preco).toFixed(
                2
              )}</li>`
          )
          .join("") +
        "</ul>";
    }

    div.innerHTML = `
      <h3>Pedido #${pedido.pedido_id}</h3>
      <p>Status Entrega: <span class="status-entrega">${pedido.status_entrega}</span></p>
      <p>Status Pagamento: <span class="status-pagamento">${pedido.status_pagamento}</span></p>
      <p>Compra ID: ${pedido.compra_id}</p>
      <div>Itens: ${itensHTML}</div>
      <div class="botoes-pedido">
        <button class="atualizar-entrega" data-id="${pedido.pedido_id}">Atualizar Entrega</button>
        <button class="atualizar-pagamento" data-id="${pedido.pedido_id}">Atualizar Pagamento</button>
        <button class="criar-pagamento" data-id="${pedido.pedido_id}">Criar Pagamento</button>
        <button class="cancelar-btn" data-id="${pedido.pedido_id}">Cancelar Pedido</button>
      </div>
    `;
    pedidosContainer.appendChild(div);
  });

  adicionarEventosPedidos();
}

// -------------------------
// Adicionar eventos aos botões
function adicionarEventosPedidos() {
  // Cancelar pedido
  document.querySelectorAll(".cancelar-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Deseja realmente cancelar este pedido?")) return;

      try {
        const res = await fetch(`${API_URL}/pedidos/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          carregarPedidos();
        } else {
          alert(data.error || "Erro ao cancelar pedido");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao cancelar pedido");
      }
    });
  });

  // Atualizar status de entrega
  document.querySelectorAll(".atualizar-entrega").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const novoStatus = prompt("Digite o novo status de entrega:");
      if (!novoStatus) return;

      try {
        const res = await fetch(`${API_URL}/pedidos/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status_entrega: novoStatus }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          carregarPedidos();
        } else {
          alert(data.error || "Erro ao atualizar status de entrega");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar status de entrega");
      }
    });
  });

  // Atualizar status de pagamento
  document.querySelectorAll(".atualizar-pagamento").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const novoStatus = prompt(
        "Digite o novo status de pagamento (Aprovado/Recusado/Pendente):"
      );
      if (!novoStatus) return;

      try {
        const res = await fetch(`${API_URL}/pagamentos/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: novoStatus }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          carregarPedidos();
        } else {
          alert(data.error || "Erro ao atualizar status do pagamento");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar status do pagamento");
      }
    });
  });

  // Criar pagamento
  document.querySelectorAll(".criar-pagamento").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const metodo = prompt(
        "Informe o método de pagamento (Cartão, Boleto, Pix):"
      );
      const valor = prompt("Informe o valor do pagamento:");

      if (!metodo || !valor) return;

      try {
        const res = await fetch(`${API_URL}/pagamentos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pedido_id: id, metodo, valor }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          carregarPedidos();
        } else {
          alert(data.error || "Erro ao criar pagamento");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao criar pagamento");
      }
    });
  });
}

// -------------------------
// Inicializa
carregarPedidos();
