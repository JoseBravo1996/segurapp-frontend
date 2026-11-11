# SegurAPP - Frontend

> **Aplicación Multiplataforma (Web, Android, iOS) de Seguridad Personal y Alertas de Emergencia**  
> Desarrollado con **React Native**, **Expo SDK 52**, **React Navigation** y **Leaflet / OpenStreetMap**.

---

## 📋 Descripción General

**SegurAPP** es un asistente y centro de operaciones de seguridad ciudadana que permite activar alertas de pánico (sonoras o silenciosas), monitorear coordenadas GPS en tiempo real con identificación de esquinas exactas, registrar zonas seguras con radios de cobertura métricos y sincronizar alertas aún en ausencia total de conectividad a internet.

---

## 🚀 Pilares y Mejoras Implementadas

### 1. Alertas en Tiempo Real (Supabase Realtime)
- **Comunicación WebSocket en Vivo ([`src/services/supabaseClient.js`](./src/services/supabaseClient.js))**:
  - Conexión al canal de eventos de la tabla `AlertHistories` vía Supabase Realtime.
  - Los contactos de emergencia que utilicen la aplicación reciben las alertas entrantes al instante, sin necesidad de recargar la pantalla.
- **Hook Unificado ([`src/hooks/useRealtimeAlerts.js`](./src/hooks/useRealtimeAlerts.js))**:
  - Suscripción limpia a eventos `INSERT` y `UPDATE`.
  - Control de duplicados mediante `Set` de identificadores.
  - Desuscripción automática al desmontar pantallas para evitar fugas de memoria (`removeChannel`).
  - Fallback transparente a polling inteligente si la conexión remota no estuviera disponible.

### 2. Modo Silencioso de Alerta (`isSilent`)
- **Activación Discreta**:
  - Botón de **"Alerta Silenciosa"** en el panel principal ([`HomeScreen.js`](./src/screens/HomeScreen.js)).
  - Envía la alerta de pánico con geolocalización al backend con `isSilent: true`.
  - **Comportamiento Seguro**: En el dispositivo emisor **no emite sonidos, ni vibración, ni abre ventanas emergentes invasivas** que puedan delatar al usuario en situaciones de riesgo (ej: violencia de género, robos o intrusión).
  - En el historial y en el mapa se señaliza con un distintivo discreto (`🔇 Silenciosa`).

### 3. Historial de Alertas con Mapa Interactivo
- **Visualización Georreferenciada ([`HistoryScreen.js`](./src/screens/HistoryScreen.js))**:
  - Sustitución de coordenadas en texto plano por mapas interactivos reales.
  - **Versión Web**: Integración completa con **OpenStreetMap + Leaflet** ([`AlertMap.web.js`](./src/components/AlertMap.web.js) y [`AlertMapPanel.web.js`](./src/components/AlertMapPanel.web.js)).
    - Marcadores temáticos vectoriales SVG (`🚨 Activa`, `✓ Resuelta`, `🔇 Silenciosa`).
    - Popups con fecha, hora, tipo de alerta, estado y enlace directo a Google Maps.
    - Redibujado garantizado con `map.invalidateSize()` y auto-encuadre con `fitBounds`.
  - **Versión Móvil (Android / iOS)**: Integración con `react-native-maps` ([`AlertMap.native.js`](./src/components/AlertMap.native.js)) utilizando Google Maps en Android y Apple Maps en iOS.
  - Selector de visualización entre **Lista de Tarjetas** y **Mapa General**.

### 4. Notificación a Múltiples Contactos de Emergencia
- Integración en [`alertHelper.js`](./src/utils/alertHelper.js) para despachar la notificación de alerta y compartir ubicación a **todos los contactos registrados** en el sistema de manera simultánea.
- Soporte para generar y abrir los enlaces correspondientes hacia WhatsApp y mensajería directa sin depender de un único contacto por palabra clave.

### 5. Modo Sin Conexión a Internet (Offline Queue)
- **Cola Local Persistente ([`src/services/offlineQueue.js`](./src/services/offlineQueue.js))**:
  - Si el usuario presiona el botón de pánico sin cobertura celular ni WiFi, la alerta se almacena de inmediato en el dispositivo utilizando `AsyncStorage`.
  - Se genera un identificador único **UUID v4 (`clientAlertId`)** para asegurar idempotencia en el backend.
  - Límite estricto de reintentos (`MAX_RETRIES = 5`) para evitar bucles.
  - Las alertas no se eliminan de la cola hasta recibir confirmación positiva `HTTP 200` del servidor.
- **Sincronización Automática al Restaurar Red ([`src/hooks/useOfflineSync.js`](./src/hooks/useOfflineSync.js))**:
  - Listener con `@react-native-community/netinfo` que detecta la reconexión y vacía automáticamente la cola de alertas pendientes en segundo plano.

---

## 🌟 Funcionalidades Avanzadas Adicionales

### 6. Asistente Guiado Contextual (In-App Onboarding)
- Guía interactiva que enseña las funcionalidades **directamente sobre la interfaz y formularios reales de la aplicación** (sin pantallas falsas ni modales emergentes redundantes):
  - Resaltado con contorno naranja brillante (`#FF5E00`) y tooltip indicativo ([`GuidedHighlight.js`](./src/components/GuidedHighlight.js)).
  - Recorrido paso a paso: Perfil (Nombre, Teléfono), Micrófono y Frase de Auxilio (*"SegurAPP, necesito ayuda"*), Zonas Seguras (Casa y Trabajo) y Botón de Emergencia.
  - Validación de avance estricta: solo permite avanzar si el dato fue efectivamente guardado en el servidor o el permiso fue concedido.
  - Barra superior de progreso con porcentaje ([`GuidedTopBanner.js`](./src/components/GuidedTopBanner.js)) y persistencia de avance por usuario en `AsyncStorage`.

### 7. Zonas Seguras con Selección Manual de Máxima Precisión
- **Buscador con Autocompletado**:
  - Debounce acelerado a 250ms, botón para limpiar texto (`close-circle`) y scroll anidado fluido.
  - Conexión al proxy de geocodificación del backend con fallback a Photon Komoot.
- **Ajuste Manual Interactivo en Mapa ([`SafeZoneMap.web.js`](./src/components/SafeZoneMap.web.js) y [`.native.js`](./src/components/SafeZoneMap.native.js))**:
  - **Clic Directo**: Permite hacer clic en cualquier punto del mapa con cursor de precisión (`crosshair`) para mover el marcador azul 🎯 y el círculo de cobertura métrico al instante.
  - **Drag & Drop**: El marcador azul es arrastrable (`draggable: true`).
  - Recálculo en tiempo real de coordenadas y consulta automática de la calle/esquina más cercana.

### 8. Detección Topológica de Esquinas y Barra Superior Verde
- **Identificación de Esquinas**: Detección de la calle actual y la calle transversal más próxima mediante topología de red vial de OpenStreetMap (ej: *`Avenida Antártida Argentina y Calle 354, Ranelagh`*).
- **Barra de Monitoreo GPS ([`LocationStatus.js`](./src/components/LocationStatus.js))**:
  - Diseño unificado en verde esmeralda con indicador *En vivo*, píldora de coordenadas GPS satelitales y dirección física en dos líneas.

### 9. Monitoreo de Voz Always-On (24/7) y Persistencia
- Reconocimiento de voz continuo sin interrupción al cambiar de pestaña en el navegador web.
- Debounce asíncrono y listeners en `visibilitychange` y `focus` para prevenir `InvalidStateError`.
- Persistencia del estado del micrófono en `AsyncStorage`.

### 10. Identidad Visual y Experiencia Web
- **Layout de Escritorio**: Barra lateral izquierda oscura con accesos de navegación, configuración y cierre de sesión en la parte inferior, ocultando la barra superior horizontal en escritorio.
- **Branding Oficial de Pestaña ([`webBranding.js`](./src/utils/webBranding.js))**:
  - Favicon oficial del escudo de SegurAPP en 64×64 px inyectado dinámicamente.
  - Título permanente **`SegurAPP`** en la pestaña del navegador, protegido contra sobreescrituras de React Navigation.

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: React Native 0.76.9 / Expo SDK 52.0.46
- **Navegación**: React Navigation v7 (`@react-navigation/native`, `@react-navigation/stack`)
- **Mapas**: Leaflet 1.9.4 (Web), React Native Maps 1.18.0 (Mobile)
- **Persistencia**: `@react-native-async-storage/async-storage`
- **Tiempo Real**: `@supabase/supabase-js`
- **Red y GPS**: `@react-native-community/netinfo`, `expo-location`
- **Reconocimiento de Voz**: Web Speech API / `expo-speech-recognition`
- **Notificaciones**: `expo-notifications`

---

## ⚙️ Configuración y Ejecución

### 1. Variables de Entorno (`.env`)
```bash
EXPO_PUBLIC_API_URL=http://localhost:5093
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Iniciar en Modo Web
```bash
npx expo start --web --port 8086
```
La aplicación abrirá en `http://localhost:8086`.

### 4. Iniciar en Dispositivo Móvil
```bash
npx expo start
```
Escanear el código QR con **Expo Go** en Android o iOS.
