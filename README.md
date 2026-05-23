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
