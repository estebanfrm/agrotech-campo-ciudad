from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Order, OrderItem, Product, User


PASSWORD = "Agrotech123"


class Command(BaseCommand):
    help = "Crea datos iniciales para probar Agrotech Campo-Ciudad."

    def handle(self, *args, **options):
        users = {
            "admin@agrotech.com": ("Admin Agrotech", User.Roles.ADMINISTRADOR),
            "productor1@agrotech.com": ("Finca El Roble", User.Roles.PRODUCTOR),
            "productor2@agrotech.com": ("Huerta La Esperanza", User.Roles.PRODUCTOR),
            "comprador1@agrotech.com": ("Restaurante Verde Mesa", User.Roles.COMPRADOR),
            "comprador2@agrotech.com": ("Hotel Plaza Central", User.Roles.COMPRADOR),
        }

        created_users = {}
        for email, (username, role) in users.items():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": username, "role": role},
            )
            if created:
                user.set_password(PASSWORD)
            user.username = username
            user.role = role
            if role == User.Roles.ADMINISTRADOR:
                user.is_staff = True
                user.is_superuser = True
            user.save()
            created_users[email] = user

        products_data = [
            ("Tomate chonto", "Hortalizas", "3400.00", "120.00", "Sutamarchan, Boyaca", 2, "Tomate fresco seleccionado para restaurantes."),
            ("Papa criolla", "Tuberculos", "2800.00", "200.00", "Ventaquemada, Boyaca", 4, "Papa criolla lavada, ideal para cocina tradicional."),
            ("Lechuga crespa", "Hortalizas", "1800.00", "90.00", "Cota, Cundinamarca", 1, "Lechuga hidropónica empacada por unidad."),
            ("Mora de Castilla", "Frutas", "5200.00", "75.00", "Silvania, Cundinamarca", 3, "Mora madura para jugos, postres y repostería."),
            ("Aguacate Hass", "Frutas", "7600.00", "150.00", "Pijao, Quindio", 5, "Aguacate Hass calibrado para hoteles y tiendas."),
            ("Cebolla larga", "Hortalizas", "2200.00", "110.00", "Aquitania, Boyaca", 2, "Cebolla larga fresca en atados."),
            ("Panela pulverizada", "Procesados", "6800.00", "60.00", "Villeta, Cundinamarca", 10, "Panela pulverizada artesanal en kilo."),
            ("Arveja verde", "Legumbres", "4100.00", "95.00", "Ipiales, Narino", 6, "Arveja verde desgranada de cosecha reciente."),
        ]

        producers = [created_users["productor1@agrotech.com"], created_users["productor2@agrotech.com"]]
        products = []
        for index, data in enumerate(products_data):
            nombre, categoria, precio, cantidad, ubicacion, days_ago, descripcion = data
            product, _ = Product.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "producer": producers[index % 2],
                    "categoria": categoria,
                    "precio": Decimal(precio),
                    "cantidad": Decimal(cantidad),
                    "ubicacion": ubicacion,
                    "fecha_cosecha": date.today() - timedelta(days=days_ago),
                    "descripcion": descripcion,
                    "estado": Product.Status.DISPONIBLE,
                },
            )
            products.append(product)

        if not Order.objects.exists():
            buyer1 = created_users["comprador1@agrotech.com"]
            buyer2 = created_users["comprador2@agrotech.com"]
            order1 = Order.objects.create(
                buyer=buyer1,
                direccion_entrega="Calle 45 #12-30, Bogota",
                observaciones="Entregar en horario de la manana.",
                estado=Order.Status.PENDIENTE,
            )
            OrderItem.objects.create(order=order1, product=products[0], cantidad=Decimal("10.00"), precio_unitario=products[0].precio)
            OrderItem.objects.create(order=order1, product=products[2], cantidad=Decimal("15.00"), precio_unitario=products[2].precio)

            order2 = Order.objects.create(
                buyer=buyer2,
                direccion_entrega="Carrera 7 #80-20, Bogota",
                observaciones="Recepcion de proveedores, piso 1.",
                estado=Order.Status.CONFIRMADO,
            )
            OrderItem.objects.create(order=order2, product=products[4], cantidad=Decimal("20.00"), precio_unitario=products[4].precio)

        self.stdout.write(self.style.SUCCESS("Datos de prueba creados o actualizados correctamente."))
