import { useState } from "react";
import { BASE_URL } from "../../config";

const BotonContrato = ({ idVenta }) => {
  const API = `${BASE_URL}/contrato`;

  const [urlContrato, setUrlContrato] = useState(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const obtenerMensajeError = async (res) => {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      return data.error || data.detalle || "No se pudo generar el contrato.";
    }

    const text = await res.text().catch(() => "");
    return text || "No se pudo generar el contrato.";
  };

  const descargarBlob = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato_${idVenta}.pdf`;
    link.click();
  };

  const generarContrato = async () => {
    try {
      const res = await fetch(`${API}/${idVenta}`);

      if (!res.ok) {
        const mensaje = await obtenerMensajeError(res);
        alert(mensaje);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        alert("El servidor no devolvio un PDF valido.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setUrlContrato(url);
      descargarBlob(url);

      alert("Contrato generado correctamente");
      setMostrarOpciones(false);
    } catch (error) {
      console.error("Error generando contrato:", error);
      alert("Error al conectar con el servidor para generar el contrato.");
    }
  };

  const handleClick = () => {
    if (!urlContrato) {
      generarContrato();
    } else {
      setMostrarOpciones(true);
    }
  };

  const descargar = () => {
    if (!urlContrato) return;
    descargarBlob(urlContrato);
  };

  const imprimir = () => {
    if (!urlContrato) return;
    window.open(urlContrato, "_blank");
  };

  return (
    <>
      <button
        className="btn btn-secondary"
        onClick={handleClick}
        style={{ marginLeft: "5px" }}
      >
        Contrato
      </button>

      {mostrarOpciones && (
        <div className="modal-contrato">
          <div className="modal-content">
            <h3>Contrato ya generado</h3>

            <button onClick={generarContrato}>Reemplazar contrato</button>
            <button onClick={descargar}>Descargar nuevamente</button>
            <button onClick={imprimir}>Imprimir</button>

            <button onClick={() => setMostrarOpciones(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BotonContrato;
