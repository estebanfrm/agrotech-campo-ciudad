# Agrotech Campo-Ciudad

MVP funcional de marketplace B2B para conectar productores rurales con compradores urbanos como restaurantes, hoteles, tiendas y comercios.

## Stack

- Backend: Django 5.2 LTS, Django REST Framework, SQLite (local) / PostgreSQL (producción), Token Authentication
- Frontend: React, Vite, Tailwind CSS
- Pruebas: Django test runner (backend) y Vitest + Testing Library (frontend)
- CI: GitHub Actions (`.github/workflows/ci.yml`)
- Roles: productor, comprador, administrador

## Requisitos Previos

- Python 3.10+
- Node.js 20+
- npm

## Ejecutar Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Backend disponible en:

- http://127.0.0.1:8000
- API: http://127.0.0.1:8000/api

## Ejecutar Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en:

- http://127.0.0.1:5173

Si necesitas apuntar el frontend a otra URL de API:

```bash
VITE_API_URL=http://127.0.0.1:8000/api npm run dev
```

En PowerShell:

```powershell
$env:VITE_API_URL="http://127.0.0.1:8000/api"; npm.cmd run dev
```

En PowerShell de Windows, si `npm` está bloqueado por la política de ejecución, usa:

```powershell
npm.cmd install
npm.cmd run dev
```

## Usuarios De Prueba

`python manage.py seed_data` crea estos usuarios en tu entorno local. Todos usan la contraseña:

```text
Agrotech123
```

| Rol | Email |
| --- | --- |
| Administrador | admin@agrotech.com |
| Productor | productor1@agrotech.com |
| Productor | productor2@agrotech.com |
| Comprador | comprador1@agrotech.com |
| Comprador | comprador2@agrotech.com |

El registro público solo permite crear cuentas de **comprador** o **productor**. Los administradores se crean con `seed_data` (local) o con `ensure_admin` (producción, ver Deploy).

## Flujos Principales

- Productor: iniciar sesión, crear producto, editar producto, eliminar producto, ver sus productos, ver los pedidos recibidos (solo las líneas de sus productos).
- Comprador: ver catálogo, buscar/filtrar, ver detalle, crear pedido, ver sus pedidos.
- Administrador: ver usuarios, productos y pedidos, cambiar estados de pedidos, eliminar productos.

## Reglas De Negocio

- El precio unitario del pedido se toma del producto, nunca del cliente.
- Crear un pedido descuenta el stock de forma atómica; si una línea no tiene stock, no se guarda nada. Las líneas repetidas del mismo producto se suman antes de validar.
- Un producto que queda en cantidad 0 pasa a `agotado` y deja de aparecer en el catálogo.
- Cancelar un pedido (admin) devuelve el stock; un pedido cancelado no se puede reactivar.
- Los compradores no pueden editar ni borrar pedidos; los cambios de estado son del administrador.
- Login y registro tienen límite de intentos por IP (`AUTH_THROTTLE_RATE`, por defecto `20/min`).

## Endpoints Principales

- `GET /api/health/`
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET/POST /api/products/` (filtros: `search`, `categoria`, `mine=true` para productores)
- `GET /api/products/categories/`
- `GET/PATCH/DELETE /api/products/<id>/`
- `GET/POST /api/orders/` (comprador: sus pedidos; productor: pedidos recibidos; admin: todos)
- `GET /api/orders/<id>/`
- `GET /api/admin/users/`
- `GET /api/admin/products/`
- `GET /api/admin/orders/`
- `PATCH /api/admin/orders/<id>/`

## Pruebas

Backend (74 pruebas: autenticación, permisos por rol, catálogo, stock de pedidos, panel admin, comandos):

```bash
cd backend
python manage.py test
```

Frontend (56 pruebas: cliente de API, rutas protegidas, registro/login, catálogo, pedidos, panel admin):

```bash
cd frontend
npm test
```

### Integración Continua

Cada push y pull request ejecuta en GitHub Actions:

- Backend: migraciones pendientes, pruebas contra PostgreSQL 16, `check --deploy` y `collectstatic` con configuración de producción.
- Frontend: `npm ci`, pruebas y build de producción.

## Verificación Rápida

```bash
cd backend
python manage.py check
python manage.py migrate
python manage.py seed_data
python manage.py test
```

```bash
cd frontend
npm install
npm test
npm run build
```

## Deploy

La configuración incluida está preparada para:

- Backend Django en Render.
- Base de datos PostgreSQL administrada por Render.
- Frontend React/Vite en Vercel.

### Backend En Render

1. En Render, crea un Blueprint desde este repositorio de GitHub:
   `https://github.com/estebanfrm/agrotech-campo-ciudad`
2. Render leerá `render.yaml` y creará:
   - Servicio web `agrotech-backend`
   - Base de datos `agrotech-db`
3. Render te pedirá los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD`: serán las credenciales del administrador en producción. Usa una contraseña larga y privada.
4. El build ejecuta:
   - `pip install -r requirements.txt`
   - `python manage.py collectstatic --noinput`
5. El start command ejecuta, en cada arranque (funciona también en el plan gratuito):
   - `python manage.py migrate --noinput`
   - `python manage.py ensure_admin` (crea o actualiza el administrador con `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
   - `gunicorn agrotech.wsgi:application --bind 0.0.0.0:$PORT`

Si ya tenías el servicio creado antes de este cambio, agrega `ADMIN_EMAIL` y `ADMIN_PASSWORD` en *Environment* del servicio y sincroniza el Blueprint.

Datos de demostración: producción arranca sin productos de ejemplo. Si quieres cargarlos, añade temporalmente `&& python manage.py seed_data` después de `ensure_admin` en el start command y quítalo tras el primer deploy. Ten en cuenta que crea usuarios con la contraseña pública `Agrotech123` (incluido `admin@agrotech.com`), así que cámbialas o elimina esos usuarios después.

Health check: `GET /api/health/` responde `{"status": "ok"}` (útil para monitoreo).

URL esperada del backend:

```text
https://agrotech-campo-ciudad.onrender.com
```

API esperada:

```text
https://agrotech-campo-ciudad.onrender.com/api
```

Si Render asigna otra URL, actualiza estas variables del servicio:

```text
ALLOWED_HOSTS=<tu-backend>.onrender.com
CSRF_TRUSTED_ORIGINS=https://<tu-backend>.onrender.com
```

### Frontend En Vercel

1. En Vercel, importa el mismo repositorio de GitHub.
2. Configura el proyecto con root directory:
   `frontend`
3. Vercel leerá `frontend/vercel.json`.
4. Configura esta variable de entorno en Vercel:

```text
VITE_API_URL=https://agrotech-campo-ciudad.onrender.com/api
```

5. Haz deploy.

Si Vercel genera una URL distinta a `https://agrotech-campo-ciudad-qfzf-kq9jtt1qu-estebanfrms-projects.vercel.app`, actualiza en Render:

```text
CORS_ALLOWED_ORIGINS=https://<tu-frontend>.vercel.app
CSRF_TRUSTED_ORIGINS=https://agrotech-campo-ciudad.onrender.com,https://<tu-frontend>.vercel.app
```

Después de actualizar CORS en Render, redeploya el backend.

### Imágenes Persistentes (Cloudinary, Gratis)

El disco de Render no es persistente: sin configuración extra, las imágenes subidas se pierden en cada deploy o reinicio (el frontend muestra el ícono de producto en su lugar). Para que duren, usa Cloudinary (plan gratuito, sin tarjeta):

1. Crea una cuenta en https://cloudinary.com.
2. En el Dashboard, copia la **API environment variable**: `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
3. En Render → Environment, agrega `CLOUDINARY_URL` con ese valor y despliega.

Con `CLOUDINARY_URL` definida, las imágenes nuevas se suben a la carpeta `agrotech/` de tu cuenta y la API devuelve su URL pública (`https://res.cloudinary.com/...`). Sin ella, se guardan en disco local como antes. Límite: 5 MB por imagen.

### Base De Datos Persistente

Sin `DATABASE_URL`, el backend usa SQLite dentro del servidor y en Render se borra en cada reinicio. Para conservar usuarios, productos y pedidos, define `DATABASE_URL` con una base PostgreSQL:

- **Neon** (https://neon.tech, gratis y no vence): crea un proyecto y copia la connection string (`postgresql://...?sslmode=require`).
- **Render PostgreSQL** (gratis, pero la base gratuita vence a los 30 días).

Las migraciones se aplican solas en el siguiente arranque. Si la conexión falla por SSL, agrega `DATABASE_SSL_REQUIRE=False`.
