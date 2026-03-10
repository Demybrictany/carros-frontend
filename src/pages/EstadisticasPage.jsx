import { useEffect, useState } from "react";
import { BASE_URL } from "../config";

const initialResumen = {
  vendido: 0,
  comprado: 0,
  gastos: 0,
  comisiones: 0,
  resultado: 0,
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const sameMonth = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth();

const sameYear = (left, right) => left.getFullYear() === right.getFullYear();

const calcularResumen = ({ ventas, gastos, carrosById, filtroVenta, filtroGasto }) => {
  const ventasFiltradas = ventas.filter((venta) => {
    const fecha = toDate(venta.Fecha);
    return fecha ? filtroVenta(fecha) : false;
  });

  const gastosFiltrados = gastos.filter((gasto) => {
    const fecha = toDate(gasto.Fecha);
    return fecha ? filtroGasto(fecha) : false;
  });

  const vendido = ventasFiltradas.reduce((acc, venta) => acc + toNumber(venta.PrecioVenta), 0);
  const comprado = ventasFiltradas.reduce((acc, venta) => {
    const carro = carrosById.get(venta.Id_Predio);
    return acc + toNumber(carro?.Precio_Compra);
  }, 0);
  const comisiones = ventasFiltradas.reduce((acc, venta) => acc + toNumber(venta.Comision), 0);
  const totalGastos = gastosFiltrados.reduce((acc, gasto) => acc + toNumber(gasto.Monto), 0);
  const resultado = vendido - comprado - totalGastos - comisiones;

  return {
    vendido,
    comprado,
    gastos: totalGastos,
    comisiones,
    resultado,
  };
};

function EstadisticasPage() {
  const [resumenHoy, setResumenHoy] = useState(initialResumen);
  const [resumenMes, setResumenMes] = useState(initialResumen);
  const [resumenAnio, setResumenAnio] = useState(initialResumen);
  const [gananciasCarro, setGananciasCarro] = useState([]);
  const [modalComisionesAbierto, setModalComisionesAbierto] = useState(false);
  const [comisionesPagadas, setComisionesPagadas] = useState({});

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const [ventasRes, gastosRes, carrosRes] = await Promise.all([
          fetch(`${BASE_URL}/ventas`),
          fetch(`${BASE_URL}/gastos`),
          fetch(`${BASE_URL}/carros-predio`),
        ]);

        const [ventasData, gastosData, carrosData] = await Promise.all([
          ventasRes.json(),
          gastosRes.json(),
          carrosRes.json(),
        ]);

        const ventas = Array.isArray(ventasData) ? ventasData : [];
        const gastos = Array.isArray(gastosData) ? gastosData : [];
        const carros = Array.isArray(carrosData) ? carrosData : [];
        const carrosById = new Map(carros.map((carro) => [carro.Id_Predio, carro]));
        const hoy = new Date();

        setResumenHoy(
          calcularResumen({
            ventas,
            gastos,
            carrosById,
            filtroVenta: (fecha) => sameDay(fecha, hoy),
            filtroGasto: (fecha) => sameDay(fecha, hoy),
          })
        );

        setResumenMes(
          calcularResumen({
            ventas,
            gastos,
            carrosById,
            filtroVenta: (fecha) => sameMonth(fecha, hoy),
            filtroGasto: (fecha) => sameMonth(fecha, hoy),
          })
        );

        setResumenAnio(
          calcularResumen({
            ventas,
            gastos,
            carrosById,
            filtroVenta: (fecha) => sameYear(fecha, hoy),
            filtroGasto: (fecha) => sameYear(fecha, hoy),
          })
        );

        const gastosPorCarro = gastos.reduce((acc, gasto) => {
          if (!gasto.Id_Predio) return acc;
          acc[gasto.Id_Predio] = (acc[gasto.Id_Predio] || 0) + toNumber(gasto.Monto);
          return acc;
        }, {});

        const ventasPorCarro = ventas.reduce((acc, venta) => {
          if (!acc[venta.Id_Predio]) {
            acc[venta.Id_Predio] = {
              Id_Predio: venta.Id_Predio,
              Placa: venta.Carro?.Placa || carrosById.get(venta.Id_Predio)?.Placa || "Sin placa",
              TotalComprado: toNumber(venta.Carro?.Precio_Compra || carrosById.get(venta.Id_Predio)?.Precio_Compra),
              TotalVendido: 0,
              Gastos: 0,
              Comisiones: 0,
              Ganancia: 0,
            };
          }

          acc[venta.Id_Predio].TotalVendido += toNumber(venta.PrecioVenta);
          acc[venta.Id_Predio].Comisiones += toNumber(venta.Comision);
          return acc;
        }, {});

        const ganancias = Object.values(ventasPorCarro).map((item) => {
          const gastosCarro = gastosPorCarro[item.Id_Predio] || 0;
          const ganancia =
            item.TotalVendido -
            item.TotalComprado -
            gastosCarro -
            item.Comisiones;

          return {
            ...item,
            Gastos: gastosCarro,
            Ganancia: ganancia,
          };
        });

        setGananciasCarro(ganancias);
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      }
    };

    cargarEstadisticas();
  }, []);

  const carrosPerdida = gananciasCarro.filter((carro) => carro.Ganancia < 0);
  const carrosConComision = gananciasCarro.filter((carro) => carro.Comisiones > 0);

  const toggleComisionPagada = (idPredio) => {
    setComisionesPagadas((prev) => ({
      ...prev,
      [idPredio]: !prev[idPredio],
    }));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Estadisticas</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px", marginBottom: "20px" }}>
        <Card title="Hoy" resumen={resumenHoy} />
        <Card title="Este mes" resumen={resumenMes} />
        <Card title="Este año" resumen={resumenAnio} />
      </div>

      <h3>Ganancia por carro</h3>
      <button
        className="btn-primary"
        onClick={() => setModalComisionesAbierto(true)}
        style={{ marginBottom: "15px" }}
      >
        Ver comisiones
      </button>
      <table border="1" cellPadding="6" width="100%">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Compra</th>
            <th>Venta</th>
            <th>Gastos</th>
            <th>Comision</th>
            <th>Ganancia / Perdida</th>
          </tr>
        </thead>
        <tbody>
          {gananciasCarro.map((carro) => (
            <tr key={carro.Id_Predio}>
              <td>{carro.Placa}</td>
              <td>Q {carro.TotalComprado.toFixed(2)}</td>
              <td>Q {carro.TotalVendido.toFixed(2)}</td>
              <td>Q {carro.Gastos.toFixed(2)}</td>
              <td>Q {carro.Comisiones.toFixed(2)}</td>
              <td style={{ color: carro.Ganancia < 0 ? "red" : "green" }}>
                Q {carro.Ganancia.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: "25px", color: "red" }}>Carros con perdida</h3>
      <table border="1" cellPadding="6" width="100%">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {carrosPerdida.map((carro) => (
            <tr key={carro.Id_Predio} style={{ color: "red" }}>
              <td>{carro.Placa}</td>
              <td>Q {carro.Ganancia.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalComisionesAbierto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#0f2740",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #2e77b8",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0 }}>Comisiones por carro</h3>
              <button className="btn-delete" onClick={() => setModalComisionesAbierto(false)}>
                Cerrar
              </button>
            </div>

            <table border="1" cellPadding="6" width="100%">
              <thead>
                <tr>
                  <th>Carro</th>
                  <th>Comision</th>
                  <th>Pagada</th>
                </tr>
              </thead>
              <tbody>
                {carrosConComision.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center" }}>
                      No hay comisiones registradas
                    </td>
                  </tr>
                ) : (
                  carrosConComision.map((carro) => (
                    <tr key={carro.Id_Predio}>
                      <td>{carro.Placa}</td>
                      <td>Q {carro.Comisiones.toFixed(2)}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(comisionesPagadas[carro.Id_Predio])}
                          onChange={() => toggleComisionPagada(carro.Id_Predio)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, resumen }) {
  const colorResultado = resumen.resultado < 0 ? "red" : "green";

  return (
    <div
      style={{
        border: "1px solid #ffffff",
        padding: "15px",
        minWidth: "200px",
        borderRadius: "8px",
      }}
    >
      <h4>{title}</h4>
      <p>Vendido: Q {resumen.vendido.toFixed(2)}</p>
      <p>Compra: Q {resumen.comprado.toFixed(2)}</p>
      <p>Gastos: Q {resumen.gastos.toFixed(2)}</p>
      <p>Comisiones: Q {resumen.comisiones.toFixed(2)}</p>
      <strong style={{ color: colorResultado }}>
        {resumen.resultado < 0 ? "Perdida" : "Ganancia"}: Q {resumen.resultado.toFixed(2)}
      </strong>
    </div>
  );
}

export default EstadisticasPage;
