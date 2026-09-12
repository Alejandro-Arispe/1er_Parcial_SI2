/**
 * Probador virtual. Dos modos, segun lo que el producto tenga disponible:
 *
 *   Camara  -> superpone la prenda sobre la imagen de la camara (todos los
 *              productos, cualquier telefono).
 *   Modelo  -> visor 3D del RecursoRA y, si el equipo lo soporta, realidad
 *              aumentada nativa (ARCore / AR Quick Look).
 *
 * El modo 3D solo aparece cuando el producto tiene un RecursoRA activo, tal
 * como define el dominio: Producto "1" -- "0..*" RecursoRA.
 */
import { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cargando, ErrorVista } from '../../components/Estados';
import { useProducto, useRecursosRA } from '../../hooks/useCatalogo';
import type { PropsStack } from '../../navigation/tipos';
import { colores, esp, radio, texto } from '../../theme';
import { ProbadorCamara } from './ProbadorCamara';
import { VisorModelo3D } from './VisorModelo3D';

type Modo = 'camara' | 'modelo';

/** Formatos que el visor 3D puede abrir. */
const FORMATOS_3D = ['GLB', 'GLTF', 'USDZ'];

export function PantallaProbador({ navigation, route }: PropsStack<'Probador'>) {
  const { idProducto, nombre } = route.params;
  const [modo, setModo] = useState<Modo>('camara');

  const producto = useProducto(idProducto);
  const recursos = useRecursosRA(idProducto);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Probador virtual' });
  }, [navigation]);

  if (producto.isLoading) return <Cargando mensaje="Preparando el probador..." />;
  if (producto.isError || !producto.data) {
    return <ErrorVista error={producto.error} onReintentar={() => void producto.refetch()} />;
  }

  const recurso3D = (recursos.data ?? []).find((r) =>
    FORMATOS_3D.includes((r.formato ?? '').toUpperCase()),
  );

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.nombre} numberOfLines={1}>
          {nombre}
        </Text>
        <View style={estilos.conmutador}>
          <Opcion texto="Camara" activo={modo === 'camara'} onPress={() => setModo('camara')} />
          <Opcion
            texto="Modelo 3D"
            activo={modo === 'modelo'}
            deshabilitado={!recurso3D}
            onPress={() => setModo('modelo')}
          />
        </View>
        {!recurso3D ? (
          <Text style={estilos.aviso}>Esta prenda todavia no tiene modelo 3D cargado.</Text>
        ) : null}
      </View>

      {modo === 'modelo' && recurso3D ? (
        <VisorModelo3D recurso={recurso3D} />
      ) : (
        <ProbadorCamara urlPrenda={producto.data.imagen_url} nombre={producto.data.nombre} />
      )}
    </View>
  );
}

function Opcion({
  texto: contenido,
  activo,
  deshabilitado = false,
  onPress,
}: {
  texto: string;
  activo: boolean;
  deshabilitado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="tab"
      accessibilityState={{ selected: activo, disabled: deshabilitado }}
      style={[estilos.opcion, activo && estilos.opcionActiva, deshabilitado && estilos.opcionInactiva]}
    >
      <Text style={[estilos.opcionTexto, activo && estilos.opcionTextoActivo]}>{contenido}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  encabezado: {
    paddingHorizontal: esp.l,
    paddingTop: esp.m,
    paddingBottom: esp.m,
    gap: esp.s,
    backgroundColor: colores.blanco,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  nombre: { ...texto.subtitulo },
  conmutador: {
    flexDirection: 'row',
    backgroundColor: colores.crema2,
    borderRadius: radio.pill,
    padding: 4,
    gap: 4,
  },
  opcion: { flex: 1, paddingVertical: esp.s, borderRadius: radio.pill, alignItems: 'center' },
  opcionActiva: { backgroundColor: colores.blanco },
  opcionInactiva: { opacity: 0.45 },
  opcionTexto: { ...texto.cuerpo, color: colores.tinta3, fontWeight: '500' },
  opcionTextoActivo: { color: colores.tinta, fontWeight: '600' },
  aviso: { ...texto.menor },
});
