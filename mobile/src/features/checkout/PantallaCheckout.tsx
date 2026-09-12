/**
 * Compra desde el movil.
 *
 *   Carrito -> Resumen -> Datos -> Metodo de pago -> Confirmacion -> Resultado
 *
 * La venta se registra con canal MOVIL. El pago se envia al backend y la
 * pantalla muestra lo que el backend responda: no se simula ninguna pasarela
 * ni se da por aprobado un pago que todavia no existe.
 */
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Boton } from '../../components/Boton';
import { AvisoEnLinea, Cargando } from '../../components/Estados';
import { ImagenProducto } from '../../components/ImagenProducto';
import { Pantalla } from '../../components/Pantalla';
import { Chip } from '../../components/Selectores';
import { useAvisos } from '../../context/AvisosContext';
import { useSesion } from '../../context/SesionContext';
import { useSucursales } from '../../hooks/useCatalogo';
import { useCarrito, useRegistrarCompra } from '../../hooks/useComercio';
import { subtotal, totalLineas } from '../../lib/domain';
import { moneda, plural } from '../../lib/format';
import type { PropsStack } from '../../navigation/tipos';
import {
  CanalVenta,
  EstadoPago,
  MetodoPago,
  TipoPago,
  type DetalleCarrito,
  type Venta,
} from '../../types/domain';

/** Referencia estable mientras el carrito todavia no llego. */
const SIN_LINEAS: DetalleCarrito[] = [];
import { colores, esp, texto } from '../../theme';

/** Metodos del dominio, con la etiqueta que entiende el cliente. */
const METODOS: Array<{ valor: MetodoPago; texto: string; tipo: TipoPago; nota: string }> = [
  {
    valor: MetodoPago.QR,
    texto: 'QR',
    tipo: TipoPago.ELECTRONICO,
    nota: 'Recibiras el codigo QR al confirmar el pedido.',
  },
  {
    valor: MetodoPago.TARJETA,
    texto: 'Tarjeta',
    tipo: TipoPago.ELECTRONICO,
    nota: 'El cobro lo procesa la pasarela del comercio.',
  },
  {
    valor: MetodoPago.TRANSFERENCIA,
    texto: 'Transferencia',
    tipo: TipoPago.ELECTRONICO,
    nota: 'Te enviaremos los datos bancarios para completar el pago.',
  },
  {
    valor: MetodoPago.EFECTIVO,
    texto: 'Efectivo en tienda',
    tipo: TipoPago.PRESENCIAL,
    nota: 'Pagas al recoger tu pedido en la sucursal elegida.',
  },
];

export function PantallaCheckout({ navigation }: PropsStack<'Checkout'>) {
  const { cliente, usuario } = useSesion();
  const { avisarError } = useAvisos();
  const carrito = useCarrito();
  const { data: sucursales } = useSucursales();
  const registrar = useRegistrarCompra();

  const [metodo, setMetodo] = useState<MetodoPago>(MetodoPago.QR);
  const [idSucursal, setIdSucursal] = useState<number>();
  const [resultado, setResultado] = useState<Venta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detalles = carrito.data?.detalles ?? SIN_LINEAS;
  const total = useMemo(() => totalLineas(detalles), [detalles]);
  const unidades = detalles.reduce((acc, d) => acc + d.cantidad, 0);
  const metodoElegido = METODOS.find((m) => m.valor === metodo)!;

  if (carrito.isLoading) return <Cargando mensaje="Preparando tu compra..." />;

  if (resultado) {
    return <Resultado venta={resultado} navigation={navigation} />;
  }

  if (detalles.length === 0) {
    return (
      <Pantalla bordes={['bottom']}>
        <View style={estilos.centro}>
          <Ionicons name="bag-outline" size={30} color={colores.tinta3} />
          <Text style={estilos.tituloResultado}>No hay nada que comprar</Text>
          <Text style={estilos.detalleResultado}>Agrega prendas a tu carrito para continuar.</Text>
          <Boton titulo="Volver al catalogo" variante="secundario" onPress={() => navigation.goBack()} />
        </View>
      </Pantalla>
    );
  }

  function confirmar() {
    if (!idSucursal) {
      setError('Elige la sucursal desde donde se prepara tu pedido.');
      return;
    }
    setError(null);
    Alert.alert(
      'Confirmar compra',
      `Se registrara tu compra por ${moneda(total)} con pago ${metodoElegido.texto.toLowerCase()}.`,
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => void registrarCompra() },
      ],
    );
  }

  async function registrarCompra() {
    try {
      const venta = await registrar.mutateAsync({
        canal: CanalVenta.MOVIL,
        id_sucursal: idSucursal ?? null,
        detalles: detalles.map((d) => ({
          id_producto: d.id_producto,
          id_talla: d.id_talla,
          id_color: d.id_color,
          cantidad: d.cantidad,
        })),
        pago: { metodo, tipo: metodoElegido.tipo },
      });
      setResultado(venta);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No pudimos registrar tu compra.';
      setError(mensaje);
      avisarError(e);
    }
  }

  return (
    <Pantalla bordes={['bottom']}>
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Paso numero={1} titulo="Resumen" detalle={plural(unidades, 'prenda', 'prendas')}>
          {detalles.map((d) => (
            <View key={d.id_detalle_carrito} style={estilos.linea}>
              <ImagenProducto
                url={d.producto?.imagen_url}
                claveReciclado={d.id_detalle_carrito}
                estilo={estilos.miniatura}
              />
              <View style={estilos.lineaCuerpo}>
                <Text style={estilos.lineaNombre} numberOfLines={1}>
                  {d.producto?.nombre ?? 'Prenda'}
                </Text>
                <Text style={estilos.lineaMeta}>
                  Talla {d.talla?.nombre ?? '-'} - {d.color?.nombre ?? '-'} - x{d.cantidad}
                </Text>
              </View>
              <Text style={estilos.lineaTotal}>{moneda(subtotal(d.cantidad, d.precio_unitario))}</Text>
            </View>
          ))}
        </Paso>

        <Paso numero={2} titulo="Tus datos">
          <View style={estilos.datos}>
            <Dato etiqueta="Nombre" valor={usuario?.nombre ?? '-'} />
            <Dato etiqueta="Correo" valor={usuario?.email ?? '-'} />
            <Dato etiqueta="Telefono" valor={cliente?.telefono || 'Sin registrar'} />
            <Dato etiqueta="Direccion" valor={cliente?.direccion || 'Sin registrar'} />
          </View>
        </Paso>

        <Paso numero={3} titulo="Sucursal de despacho" detalle="Desde aqui se prepara tu pedido">
          <View style={estilos.opciones}>
            {(sucursales ?? []).map((s) => (
              <Chip
                key={s.id_sucursal}
                texto={`${s.nombre.replace('FashionStore ', '')} - ${s.ciudad}`}
                activo={idSucursal === s.id_sucursal}
                onPress={() => setIdSucursal(s.id_sucursal)}
              />
            ))}
          </View>
        </Paso>

        <Paso numero={4} titulo="Metodo de pago">
          <View style={estilos.opciones}>
            {METODOS.map((m) => (
              <Chip key={m.valor} texto={m.texto} activo={metodo === m.valor} onPress={() => setMetodo(m.valor)} />
            ))}
          </View>
          <Text style={estilos.nota}>{metodoElegido.nota}</Text>
        </Paso>

        {error ? <AvisoEnLinea texto={error} /> : null}
      </ScrollView>

      <View style={estilos.pie}>
        <View style={estilos.filaTotal}>
          <Text style={estilos.totalEtiqueta}>Total a pagar</Text>
          <Text style={estilos.totalValor}>{moneda(total)}</Text>
        </View>
        <Boton
          titulo="Confirmar compra"
          icono="checkmark-circle-outline"
          ancho
          onPress={confirmar}
          cargando={registrar.isPending}
        />
      </View>
    </Pantalla>
  );
}

function Paso({
  numero,
  titulo,
  detalle,
  children,
}: {
  numero: number;
  titulo: string;
  detalle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.paso}>
      <View style={estilos.pasoEncabezado}>
        <View style={estilos.pasoNumero}>
          <Text style={estilos.pasoNumeroTexto}>{numero}</Text>
        </View>
        <View style={estilos.flex}>
          <Text style={estilos.pasoTitulo}>{titulo}</Text>
          {detalle ? <Text style={estilos.lineaMeta}>{detalle}</Text> : null}
        </View>
      </View>
      <View style={estilos.pasoCuerpo}>{children}</View>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function Resultado({
  venta,
  navigation,
}: {
  venta: Venta;
  navigation: PropsStack<'Checkout'>['navigation'];
}) {
  const pago = venta.pagos[0];
  const rechazado = pago?.estado === EstadoPago.RECHAZADO;
  const pendiente = pago?.estado === EstadoPago.PENDIENTE;

  return (
    <Pantalla bordes={['bottom']}>
      <View style={estilos.centro}>
        <View
          style={[
            estilos.circuloResultado,
            { backgroundColor: rechazado ? colores.errorSuave : colores.exitoSuave },
          ]}
        >
          <Ionicons
            name={rechazado ? 'close-circle-outline' : pendiente ? 'time-outline' : 'checkmark-circle-outline'}
            size={34}
            color={rechazado ? colores.error : colores.exito}
          />
        </View>

        <Text style={estilos.tituloResultado}>
          {rechazado ? 'Pago rechazado' : pendiente ? 'Compra registrada' : 'Compra confirmada'}
        </Text>
        <Text style={estilos.detalleResultado}>
          {rechazado
            ? 'Tu pedido quedo registrado pero el pago no se completo. Puedes intentar con otro metodo desde tus compras.'
            : pendiente
              ? `Tu pedido #${venta.id_venta} espera la confirmacion del pago.`
              : `Tu pedido #${venta.id_venta} por ${moneda(venta.total)} fue registrado.`}
        </Text>

        <View style={estilos.accionesResultado}>
          <Boton
            titulo="Ver mis compras"
            ancho
            onPress={() => navigation.replace('Compras')}
          />
          <Boton
            titulo="Seguir comprando"
            variante="secundario"
            ancho
            onPress={() => navigation.navigate('Tabs')}
          />
        </View>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: esp.l, gap: esp.l, paddingBottom: esp.xl },
  paso: { gap: esp.m },
  pasoEncabezado: { flexDirection: 'row', alignItems: 'center', gap: esp.m },
  pasoNumero: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumeroTexto: { color: colores.blanco, fontSize: 12, fontWeight: '700' },
  pasoTitulo: { ...texto.subtitulo },
  pasoCuerpo: { gap: esp.s, paddingLeft: 38 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: esp.m },
  miniatura: { width: 44, height: 58 },
  lineaCuerpo: { flex: 1, gap: 2 },
  lineaNombre: { ...texto.cuerpo, fontWeight: '600', color: colores.tinta },
  lineaMeta: { ...texto.menor },
  lineaTotal: { ...texto.cuerpo, fontWeight: '600', color: colores.tinta },
  datos: { gap: esp.s },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: esp.m },
  datoEtiqueta: { ...texto.menor },
  datoValor: { ...texto.cuerpo, flex: 1, textAlign: 'right', color: colores.tinta },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.s },
  nota: { ...texto.menor, marginTop: esp.xs },
  pie: {
    paddingHorizontal: esp.l,
    paddingTop: esp.m,
    paddingBottom: esp.m,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.blanco,
    gap: esp.s,
  },
  filaTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalEtiqueta: { ...texto.subtitulo },
  totalValor: { ...texto.titulo, fontFamily: undefined, fontWeight: '700' },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: esp.xl,
    gap: esp.s,
  },
  circuloResultado: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: esp.s,
  },
  tituloResultado: { ...texto.titulo, textAlign: 'center' },
  detalleResultado: { ...texto.cuerpo, textAlign: 'center', color: colores.tinta3 },
  accionesResultado: { alignSelf: 'stretch', gap: esp.s, marginTop: esp.l },
});
