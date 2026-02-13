# Ticket Admin - Angular Assessment

> Consola administrativa para gestión de tickets con soporte offline y sincronización automática.

## 🚀 Quick Start


Puedes ver la aplicacion por aqui sin necesidad de instalar nada:https:

# Vercel deployed URL
https://assessment-frontend-rust-six.vercel.app/

O tambien instalar localmente:

```bash
# Install dependencies
npm install

# Generate test data (10,500 tickets)
npx ts-node scripts/generate-tickets.ts

# Start development server
npm start



```

La aplicación estará disponible en **http://localhost:4200**

## 📋 Stack Técnico

- **Angular 21.1.0** - Framework principal
- **TypeScript 5.9.2** - Tipado estático
- **RxJS 7.8.0** - Programación reactiva
- **Tailwind CSS 4.1.18** - Estilos utility-first
- **Angular CDK** - Virtual Scroll
- **idb 8.0.3** - Wrapper moderno para IndexedDB
- **Jest** - Testing framework

## 🏗️ Arquitectura

### Estructura de Carpetas

```
src/app/
├── core/                           # Servicios base y utilidades
│   ├── services/
│   │   ├── ticket.service.ts       # Simula HTTP calls
│   │   ├── ticket-store.service.ts # Estado centralizado (BehaviorSubject)
│   │   ├── offline.service.ts      # IndexedDB + sync queue
│   │   └── connectivity.service.ts # Detecta online/offline
│   ├── guards/
│   │   └── tickets.resolver.ts     # Precarga tickets
│   ├── models/                     # Types e interfaces
│   └── utils/
│       ├── data-sanitizer.ts       # Normaliza datos inválidos
│       └── ticket-validators.ts    # Validators cross-field
├── features/tickets/               # Feature module
│   ├── ticket-list/                # Container component
│   ├── ticket-table/               # Tabla con virtual scroll
│   ├── ticket-filters/             # Filtros combinables
│   ├── ticket-edit/                # Panel lateral con Reactive Forms
│   └── sync-status/                # Indicador de sync pendiente
└── shared/                         # Componentes reutilizables
    ├── components/badge/
    └── pipes/relative-time.pipe.ts
```

### Decisiones de Arquitectura

#### 1. Estado Centralizado con BehaviorSubject

En lugar de usar NgRx o Akita, implementé un **store service simple** basado en `BehaviorSubject`:

**¿Por qué?**
- Para un reto de 6 horas, evitar boilerplate innecesario
- Mantener principios reactivos sin complejidad adicional
- Facilita testing y debugging

**Patrón utilizado:**
```typescript
// Estado inmutable + observables derivados
private state = new BehaviorSubject<State>(INITIAL_STATE);
readonly tickets$ = this.select(s => s.tickets).pipe(shareReplay(1));

// Filtros como función pura
readonly filteredTickets$ = combineLatest([tickets$, filters$, sort$]).pipe(
  map(([tickets, filters, sort]) => this.applyFiltersAndSort(...))
);
```

#### 2. Offline-First con IndexedDB

**Estrategia:**
- Cache completo de tickets en IndexedDB
- Sync queue para cambios offline
- Auto-sync al detectar reconexión
- **Last-write-wins** (sin UI compleja de conflictos)

**¿Por qué last-write-wins?**
- El reto pide "interfaz simple para resolución de conflictos"
- Un modal complejo con comparación lado a lado sería over-engineering para 6h
- En producción, se podría implementar merge por timestamp o CRDTs

#### 3. Virtual Scroll (CDK)

Con 10,500 tickets, el rendering tradicional sería inviable. Uso `cdk-virtual-scroll-viewport` con:
- `itemSize="48"` (altura fija por fila)
- `trackBy` por ID para evitar re-renders innecesarios

#### 4. Reactive Forms con Validación Cross-Field

```typescript
// Validators personalizados
blockedNeedsReasonValidator  // status='blocked' → requiere motivo
priorityOneNeedsAssigneeValidator  // priority=1 → requiere assignee

// Validación en nivel de FormGroup
form = this.fb.group({...}, {
  validators: [blockedNeedsReasonValidator, priorityOneNeedsAssigneeValidator]
});
```

## 🎯 Requerimientos Implementados

### ✅ Funcionalidad Core

- [x] Virtualización real con Angular CDK Virtual Scroll
- [x] 10,500 tickets con datos inválidos intencionales
- [x] Filtros combinables (texto, status, priority, tags, fecha)
- [x] Ordenamiento multi-columna (click → asc → desc → remove)
- [x] Mostrar/ocultar columnas
- [x] Edición con panel lateral + Reactive Forms
- [x] Validaciones cross-field obligatorias
- [x] Actualización optimista
- [x] Offline con IndexedDB
- [x] Auto-sync al reconectar
- [x] Indicador visual de cambios pendientes

### ✅ RxJS Patterns

- `debounceTime(300)` en search input
- `switchMap` para auto-sync
- `shareReplay({ bufferSize: 1, refCount: true })` en todos los selectors
- `combineLatest` para filtros derivados
- `takeUntilDestroyed(destroyRef)` para limpieza de suscripciones
- Evitadas suscripciones anidadas

### ✅ Performance

- `ChangeDetectionStrategy.OnPush` en todos los componentes
- `trackBy` en virtual scroll
- Filtros como función pura (no recalcular en cada CD)
- Lazy loading de feature module
- Tree-shakeable con standalone components

### 📊 Verificación de Performance

**Herramientas utilizadas:**
1. Chrome DevTools → Performance tab
   - Grabación durante scroll de 10,500 items
   - FPS estable en ~60fps
   - No frame drops significativos

2. Chrome DevTools → Memory tab
   - Heap snapshots antes/después de filtros
   - No memory leaks detectados

3. Angular DevTools
   - Change detection profiler
   - Componentes con OnPush no se re-renderizan innecesariamente

**Métricas:**
- Tiempo de carga inicial: ~1.2s
- Scroll fluido con 10k items (virtual scroll)
- Búsqueda con debounce: responsive sin lag
- Build size: 80.42 KB (gzipped)

## 🧪 Testing

```bash
npm test
```

**Coverage:**
- `ticket-store.service.spec.ts` - Servicio de estado (BehaviorSubject patterns, filtros, selectors)
- `ticket-validators.spec.ts` - Validaciones cross-field complejas

**Criterio de testing:**
Siguiendo las recomendaciones del assessment, incluí solo tests críticos:
- ✅ Servicios/capa de estado
- ✅ Validaciones complejas de formularios
- ❌ Snapshots sin valor semántico
- ❌ Tests triviales de componentes UI

## 🔄 Trade-offs y Decisiones

### 1. BehaviorSubject vs NgRx
**Elegido:** BehaviorSubject
**Por qué:** Para 6h de desarrollo, NgRx agrega boilerplate (actions, reducers, effects) sin beneficio real. BehaviorSubject es testeable, reactivo y suficiente.

### 2. Conflict Resolution: Last-Write-Wins
**Elegido:** Sin UI de conflictos
**Por qué:** El reto pide "interfaz simple". Un modal con comparación lado a lado sería over-engineering. En producción usaría CRDTs o merge por timestamp.

### 3. Column Toggles en Filters vs Header
**Elegido:** En componente de filtros
**Por qué:** Mantener toda la configuración de vista en un solo lugar. Alternative sería en table header pero separa concerns.

### 4. Standalone Components
**Elegido:** 100% standalone
**Por qué:** Angular 17+ recomienda esta arquitectura. Mejor tree-shaking y menos boilerplate de NgModules.

## 🚧 Qué Mejoraría con Más Tiempo

### Funcionalidad
1. **Bulk actions** - Seleccionar múltiples tickets y aplicar cambios
2. **Export/Import** - CSV, Excel
3. **Advanced filters** - Query builder con AND/OR
4. **Ticket history** - Auditoría de cambios
5. **Real-time updates** - WebSockets para sync multi-usuario

### Arquitectura
6. **State management** - Migrar a Signal-based state (Angular 16+)
7. **Error handling** - Interceptor HTTP centralizado con retry logic
8. **Logging** - Sentry/LogRocket para producción
9. **E2E tests** - Playwright o Cypress
10. **CI/CD** - GitHub Actions con deploy automático

### UX/UI
11. **Keyboard shortcuts** - Navegación por teclado
12. **Accessibility** - ARIA labels, screen reader support
13. **Dark mode** - Tema oscuro con preferencia de sistema
14. **Mobile responsive** - Optimizar para tablets/móviles

### Performance
15. **Service Worker** - PWA con offline completo
16. **Code splitting** - Lazy load por ruta
17. **Image optimization** - WebP, lazy loading

## 🤖 Uso de IA en el Desarrollo

IA utilizada: Claude Code.

### ✅ Generado con IA:

1. **Script generador de datos** (`scripts/generate-tickets.ts`)
   - generado con IA para ahorro de tiempo y productividad
   - Incluye lógica para datos inválidos (fechas, IDs duplicados, etc.)

2. **Setup inicial del proyecto**
   - Configuración de Jest
   - Configuración de Tailwind CSS
   - Estructura de carpetas base

3. **Boilerplate de componentes**
   - Templates iniciales de componentes
   - Imports y decoradores básicos

4. **Modelo de tipos TypeScript**
   - Interfaces `Ticket`, `TicketFilters`, `SyncQueueItem`
   - Constants y enums

### 🛠️ Ajustado Manualmente:

1. **Arquitectura del Store**
   - Diseñé el patrón BehaviorSubject-based store
   - Decidí selectores y cómo estructurar el estado

2. **Lógica de filtros combinables**
   - Implementé función pura `applyFiltersAndSort`
   - Decidí usar `combineLatest` vs otros operators

3. **Estrategia offline**
   - Diseño de 2 object stores (tickets + sync-queue)
   - Decisión de last-write-wins vs conflict resolution UI
   - Auto-sync con `ConnectivityService`

4. **Validators cross-field**
   - Lógica de validación personalizada
   - Integración con Reactive Forms

5. **Performance optimizations**
   - Elección de `OnPush` strategy
   - `shareReplay` con `refCount: true`
   - Virtual scroll configuration

6. **Testing strategy**
   - Decidí qué testear y qué omitir
   - Trade-off entre coverage y tiempo

7. **Simplificación final**
   - Eliminé ConflictDialog (demasiado complejo para 6h)
   - Simplifiqué OfflineService (2 stores vs 3)
   - Reduje SyncStatusComponent

### 💡 Proceso de Trabajo

Mi flujo fue:
1. **IA** generó scaffolding y boilerplate
2. **Yo** diseñé arquitectura y tomé decisiones técnicas
3. **IA** ayudó con implementación de detalles
4. **Yo** revisé, ajusté y simplifiqué código
5. **IA** ayudó con testing y documentación

**Criterio técnico aplicado:**
- Evité over-engineering (ej: eliminar conflictos complejos)
- Prioricé legibilidad
- Balance de tiempo en base a duracion del reto (6 horas)

## 📝 Notas Adicionales

- Los datos generados (`public/tickets.json`) incluyen intencionalmente errores para probar `data-sanitizer.ts`
- El modo offline se puede probar en Chrome DevTools → Network → Offline
- Los cambios offline se sincronizan automáticamente al reconectar
- El indicador visual (bottom-right) muestra estado de sincronización

---

**Desarrollado como parte del assessment técnico para Senior Frontend Engineer (Angular)**
**Tiempo estimado:** 6 horas
**Fecha:** Febrero 2026
