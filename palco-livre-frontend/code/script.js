let inputs = 0;

function abrirBusca() {
  if (inputs === 0) {
    const achar = document.getElementById("buscar");
    const criar = document.createElement("input");
    criar.id = "barra";
    achar.appendChild(criar);
    inputs = 1;
  } else {
    const find = document.getElementById("barra");
    find.remove();
    inputs = 0;
  }
}
