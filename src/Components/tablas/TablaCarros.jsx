import { BASE_URL } from "../../config";
import TablaDesplegable from "./TablaDesplegable";

function TablaCarros({ carros, seleccionar, refrescar }) {

  const eliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este carro?")) return;

    await fetch(`${BASE_URL}/carros-predio/${id}`, {
      method: "DELETE",
    });

    refrescar();
  };

  const obtenerMensajeError = async (res) => {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      return data.error || data.detalle || "No se pudo generar el contrato";
    }

    const text = await res.text().catch(() => "");
    return text || "No se pudo generar el contrato";
  };

  const descargarContratoCompra = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/contrato-compra-carro/${id}`);

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
      const link = document.createElement("a");

      link.href = url;
      link.download = `contrato_compra_${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando contrato de compra:", error);
      alert("Error al conectar con el servidor para generar el contrato.");
    }
  };

  return (
    <TablaDesplegable total={carros.length}>
      {(limite) => (
    <table className="table-modern">
      <thead>
        <tr>
          <th>Id</th>
          <th>Foto</th>
          <th>Placa</th>
          <th>Modelo</th>
          <th>Año</th>
          <th>Color</th>
          <th>VIN</th>
          <th>Motor</th>
          <th>Chasis</th>
          <th>Vendedor</th>
          <th>Comprador</th>
          <th>Días Traspaso</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        {carros.slice(0, limite).map((c) => (
          <tr key={c.Id_Predio}>

            <td>{c.Id_Predio}</td>

            <td>
              {c.FotoCarro ? (
                <img
                  src={c.FotoCarro}
                  alt="Foto del carro"
                  style={{
                    width: "80px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                  }}
                />
              ) : (
                "Sin foto"
              )}
            </td>

            <td>{c.Placa}</td>
            <td>{c.Modelo}</td>
            <td>{c.Anio}</td>
            <td>{c.Color}</td>
            <td>{c.Vin}</td>
            <td>{c.Num_Motor}</td>
            <td>{c.Num_Chasis}</td>

            <td>
              {c.Vendedor
                ? `${c.Vendedor.Nombre} (${c.Vendedor.Dpi})`
                : "No asignado"}
            </td>

            <td>
              {c.Comprador
                ? `${c.Comprador.Nombre} (${c.Comprador.DPI})`
                : "Sin comprador"}
            </td>

            <td>{c.Tiempo_Traspaso ?? "—"}</td>

            <td>
              <button
                className="btn-edit"
                onClick={() => seleccionar(c)}
              >
                Editar
              </button>

              <button
                className="btn-delete"
                onClick={() => eliminar(c.Id_Predio)}
              >
                Eliminar
              </button>

              <button
                className="btn-contrato"
                onClick={() => descargarContratoCompra(c.Id_Predio)}
              >
                Descargar Contrato Compra
              </button>

            </td>

          </tr>
        ))}
      </tbody>
    </table>
      )}
    </TablaDesplegable>
  );
}

export default TablaCarros;
