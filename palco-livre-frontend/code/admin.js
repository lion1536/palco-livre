// admin.js
const token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", () => {
  // Elementos do formulário
  const instrumentoForm = document.getElementById("instrumentoForm");
  const formTitle = document.getElementById("formTitle");
  const btnCancelar = document.getElementById("btnCancelar");
  const instrumentosBody = document.getElementById("instrumentosBody");

  const inputId = document.getElementById("instrumentoId");
  const inputNome = document.getElementById("nome");
  const inputCategoria = document.getElementById("categoria");
  const inputMarca = document.getElementById("marca");
  const inputDescricao = document.getElementById("descricao");
  const inputPreco = document.getElementById("preco");
  const inputEstoque = document.getElementById("estoque");
  const inputImagem = document.getElementById("imagem");

  if (!instrumentoForm || !instrumentosBody) {
    console.error("Elementos obrigatórios do DOM não encontrados!");
    return;
  }

  let instrumentos = [];

  // -------------------------
  // Função para carregar todos os instrumentos
  async function carregarInstrumentos() {
    try {
      const res = await fetch("http://localhost:3000/instrumentos", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      instrumentos = await res.json();
      renderInstrumentos();
    } catch (err) {
      console.error("Erro ao carregar instrumentos:", err);
    }
  }

  // -------------------------
  // Renderiza a lista de instrumentos
  function renderInstrumentos() {
    instrumentosBody.innerHTML = "";
    instrumentos.forEach((item) => {
      const tr = document.createElement("tr");
      const imgSrc = item.imagem_principal
        ? `http://localhost:3000/uploads/${item.imagem_principal}`
        : "../images/default-profile.png";

      tr.innerHTML = `
        <td><img src="${imgSrc}" alt="${item.nome}" width="50"/></td>
        <td>${item.nome}</td>
        <td>${item.categoria}</td>
        <td>${item.marca}</td>
        <td>R$ ${Number(item.preco).toFixed(2)}</td>
        <td>${item.estoque}</td>
        <td>
          <button class="btn-editar" data-id="${
            item.instrumento_id
          }">Editar</button>
          <button class="btn-excluir" data-id="${
            item.instrumento_id
          }">Excluir</button>
        </td>
      `;
      instrumentosBody.appendChild(tr);
    });

    // Eventos de editar
    instrumentosBody.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        preencherFormulario(id);
      });
    });

    // Eventos de excluir
    instrumentosBody.querySelectorAll(".btn-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (confirm("Deseja realmente excluir este instrumento?")) {
          try {
            const res = await fetch(
              `http://localhost:3000/instrumentos/${id}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (!res.ok) throw new Error("Erro ao excluir instrumento");
            alert("Instrumento excluído!");
            await carregarInstrumentos();
          } catch (err) {
            alert(err.message);
          }
        }
      });
    });
  }

  // -------------------------
  // Preenche formulário para edição
  function preencherFormulario(id) {
    const instrumento = instrumentos.find((i) => i.instrumento_id == id);
    if (!instrumento) return;

    inputId.value = instrumento.instrumento_id;
    inputNome.value = instrumento.nome;
    inputCategoria.value = instrumento.categoria;
    inputMarca.value = instrumento.marca;
    inputDescricao.value = instrumento.descricao || "";
    inputPreco.value = instrumento.preco;
    inputEstoque.value = instrumento.estoque;

    formTitle.textContent = "Editar Instrumento";
  }

  // -------------------------
  // Limpa formulário
  function limparFormulario() {
    instrumentoForm.reset();
    inputId.value = "";
    formTitle.textContent = "Adicionar Instrumento";
  }

  btnCancelar.addEventListener("click", limparFormulario);

  // -------------------------
  // Submissão do formulário
  instrumentoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const formData = {
      nome: inputNome.value,
      categoria: inputCategoria.value,
      marca: inputMarca.value,
      descricao: inputDescricao.value,
      preco: parseFloat(inputPreco.value),
      estoque: parseInt(inputEstoque.value),
    };

    try {
      let url = "http://localhost:3000/instrumentos";
      let method = "POST";

      if (id) {
        url += `/${id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar instrumento");
      }

      alert(`Instrumento ${id ? "atualizado" : "adicionado"} com sucesso!`);
      limparFormulario();
      carregarInstrumentos();
    } catch (err) {
      alert(err.message);
    }
  });

  // Inicializa
  carregarInstrumentos();
});
