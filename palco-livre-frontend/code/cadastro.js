document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cadastroForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nomeconta").value.trim();
    const email = document.getElementById("emailconta").value.trim();
    const senha = document.getElementById("senhaconta").value.trim();
    const endereco = "Endereço de teste";

    if (!nome || !email || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, endereco }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Cadastro realizado com sucesso!");
        form.reset();
      } else {
        alert("Erro no cadastro: " + (data.error || "Erro desconhecido"));
      }
    } catch (error) {
      alert("Erro na conexão com o servidor: " + error.message);
    }
  });
});
