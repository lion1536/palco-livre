import express from "express";
import cors from "cors";

const app = express();

const PORT = 3000;

const allowedOrigins = ["http://localhost:3000"];

// Configuração do cors
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS não permitido"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "DELETE"],
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  })
);

app.use(express.json());

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor funcionando!");
});

// Inicialização do servidor
app.listen(PORT || 3000, () => {
  console.log(`Servidor rodando na porta: ${PORT}`);
});
