const API_URL = "http://localhost:3000";
const pagamentosContainer = document.getElementById("pagamentosContainer");
const btnLogout = document.getElementById("btnLogout");
const token = localStorage.getItem("token");

if (!token) window.location.href = "login.html";

// Logout
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// -------------------------
// Carregar todos os pagamentos do usuário
async function carregarPagamentos() {
  try {
    const res = await fetch(`${API_URL}/pagamentos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao listar pagamentos");
    const pagamentos = await res.json();
    renderPagamentos(pagamentos);
  } catch (err) {
    console.error(err);
    pagamentosContainer.innerHTML =
      "<p>Erro ao carregar pagamentos. Tente novamente.</p>";
  }
}

// -------------------------
// Renderizar pagamentos
function renderPagamentos(pagamentos) {
  pagamentosContainer.innerHTML = "";
  if (!pagamentos.length) {
    pagamentosContainer.innerHTML = "<p>Você ainda não possui pagamentos.</p>";
    return;
  }

  pagamentos.forEach((pg) => {
    const div = document.createElement("div");
    div.classList.add("pagamento-card");

    div.innerHTML = `
      <h3>Pagamento #${pg.pagamento_id}</h3>
      <p>Pedido ID: ${pg.pedido_id}</p>
      <p>Método: ${pg.metodo}</p>
      <p>Valor: R$ ${Number(pg.valor).toFixed(2)}</p>
      <p>Status: <span class="status">${pg.status}</span></p>
      <div class="botoes">
        <button class="atualizar-status" data-id="${pg.pagamento_id}">
          Atualizar Status
        </button>
      </div>
    `;
    pagamentosContainer.appendChild(div);
  });

  adicionarEventosPagamentos();
}

// -------------------------
// Eventos dos botões
function adicionarEventosPagamentos() {
  document.querySelectorAll(".atualizar-status").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const novoStatus = prompt(
        "Informe o novo status (Aprovado, Recusado, Pendente):"
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
          carregarPagamentos();
        } else {
          alert(data.error || "Erro ao atualizar status do pagamento");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar status do pagamento");
      }
    });
  });
}

// -------------------------
// Inicializa
carregarPagamentos();
