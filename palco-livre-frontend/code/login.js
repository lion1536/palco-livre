document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  if (!btnLogin) return console.error("Botão de login não encontrado!");

  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Todos os campos são obrigatórios.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        alert("Login realizado com sucesso!");
        console.log("Usuário logado:", data.usuario);
      } else {
        alert("Erro no login: " + (data.error || "Erro desconhecido"));
      }
    } catch (error) {
      alert("Erro na conexão com o servidor: " + error.message);
    }
  });
});
