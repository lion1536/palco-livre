// perfil.js

// URL base da API
const API_URL = "http://localhost:3000";

// Elementos do DOM
const imagemPerfil = document.getElementById("imagemPerfil");
const uploadFoto = document.getElementById("uploadFoto");
const btnUpload = document.getElementById("btnUpload");
const btnLogout = document.getElementById("btnLogout");

const nomeUsuario = document.getElementById("nomeUsuario");
const emailUsuario = document.getElementById("emailUsuario");

// Token salvo no login
const token = localStorage.getItem("token");

// Redireciona para login se não tiver token
if (!token) {
  window.location.href = "login.html";
}

// Função para carregar dados do usuário
async function carregarPerfil() {
  try {
    const res = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao buscar dados do usuário");

    const usuario = await res.json();
    nomeUsuario.textContent = usuario.nome;
    emailUsuario.textContent = usuario.email;
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// Função para carregar foto de perfil
async function carregarFoto() {
  try {
    const res = await fetch(`${API_URL}/foto-perfil`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao buscar foto de perfil");

    const data = await res.json();
    imagemPerfil.src = data.foto
      ? API_URL + data.foto + "?t=" + Date.now()
      : "../images/profile-svgrepo-com (1).svg";
  } catch (err) {
    console.error("Erro ao carregar foto:", err);
    imagemPerfil.src = "../images/profile-svgrepo-com (1).svg"; // fallback
  }
}

// Função para enviar nova foto
async function enviarFoto() {
  const arquivo = uploadFoto.files[0];
  if (!arquivo) {
    alert("Selecione uma foto antes de enviar.");
    return;
  }

  const formData = new FormData();
  formData.append("foto", arquivo);

  try {
    const res = await fetch(`${API_URL}/upload-foto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // mantenha se o backend exigir
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      imagemPerfil.src = API_URL + data.foto + "?t=" + Date.now();
      alert("Foto atualizada com sucesso!");
    } else {
      alert("Erro ao atualizar foto.");
    }
  } catch (err) {
    console.error("Erro no upload:", err);
    alert("Erro ao enviar foto.");
  }
}

// Logout
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Upload de foto
btnUpload.addEventListener("click", enviarFoto);

// Inicializa perfil e foto
document.addEventListener("DOMContentLoaded", () => {
  carregarPerfil();
  carregarFoto();
});
