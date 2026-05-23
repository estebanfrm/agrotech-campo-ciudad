# Agrotech Campo-Ciudad

MVP funcional de marketplace B2B para conectar productores rurales con compradores urbanos como restaurantes, hoteles, tiendas y comercios.

## Stack

- Backend: Django, Django REST Framework, SQLite, Token Authentication
- Frontend: React, Vite, Tailwind CSS
- Roles: productor, comprador, administrador

## Requisitos Previos

- Python 3.10+
- Node.js 18+
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

Todos usan la contraseña:

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

## Flujos Principales

- Productor: iniciar sesión, crear producto, editar producto, eliminar producto, ver sus productos.
- Comprador: ver catálogo, buscar/filtrar, ver detalle, crear pedido, ver sus pedidos.
- Administrador: ver usuarios, productos y pedidos, cambiar estados de pedidos, eliminar productos.

## Endpoints Principales

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET/POST /api/products/`
- `GET/PATCH/DELETE /api/products/<id>/`
- `GET/POST /api/orders/`
- `GET /api/orders/<id>/`
- `GET /api/admin/users/`
- `GET /api/admin/products/`
- `GET /api/admin/orders/`
- `PATCH /api/admin/orders/<id>/`

## Verificación Rápida

```bash
cd backend
python manage.py check
python manage.py migrate
python manage.py seed_data
```

```bash
cd frontend
npm install
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
3. El build ejecuta:
   - `pip install -r requirements.txt`
   - `python manage.py collectstatic --noinput`
4. Antes de iniciar el servicio ejecuta:
   - `python manage.py migrate`
   - `python manage.py seed_data`
5. El start command usa:
   - `gunicorn agrotech.wsgi:application --bind 0.0.0.0:$PORT`

URL esperada del backend:

```text
https://agrotech-backend.onrender.com
```

API esperada:

```text
https://agrotech-backend.onrender.com/api
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
VITE_API_URL=https://agrotech-backend.onrender.com/api
```

5. Haz deploy.

Si Vercel genera una URL distinta a `https://agrotech-campo-ciudad.vercel.app`, actualiza en Render:

```text
CORS_ALLOWED_ORIGINS=https://<tu-frontend>.vercel.app
```

Después de actualizar CORS en Render, redeploya el backend.

### Nota Sobre Imágenes En Producción

El MVP permite subir imágenes localmente. En deploy, Render no garantiza almacenamiento persistente para archivos subidos en disco. Para producción real conviene conectar un storage externo como S3, Cloudinary o similar. El flujo principal del MVP funciona sin imágenes porque son opcionales.
