from datetime import date
from decimal import Decimal

from django.core.cache import cache
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from core.models import Order, OrderItem, Product, User

PASSWORD = "Clave12345"


class AgrotechTestCase(APITestCase):
    def setUp(self):
        # El throttling usa la caché: se limpia para que las pruebas sean independientes.
        cache.clear()
        self.admin = self.create_user("admin@test.com", "Admin", User.Roles.ADMINISTRADOR, is_staff=True)
        self.productor = self.create_user("productor@test.com", "Finca Test", User.Roles.PRODUCTOR)
        self.otro_productor = self.create_user("productor2@test.com", "Huerta Test", User.Roles.PRODUCTOR)
        self.comprador = self.create_user("comprador@test.com", "Restaurante Test", User.Roles.COMPRADOR)
        self.otro_comprador = self.create_user("comprador2@test.com", "Hotel Test", User.Roles.COMPRADOR)

    @staticmethod
    def create_user(email, username, role, **extra):
        user = User(email=email, username=username, role=role, **extra)
        user.set_password(PASSWORD)
        user.save()
        return user

    @staticmethod
    def create_product(producer, **overrides):
        data = {
            "nombre": "Tomate",
            "categoria": "Hortalizas",
            "precio": Decimal("3000.00"),
            "cantidad": Decimal("100.00"),
            "ubicacion": "Boyacá",
            "fecha_cosecha": date(2026, 9, 1),
            "descripcion": "Fresco",
        }
        data.update(overrides)
        return Product.objects.create(producer=producer, **data)

    @staticmethod
    def create_order(buyer, items, **overrides):
        order = Order.objects.create(buyer=buyer, direccion_entrega="Calle 1 #2-3", **overrides)
        for product, cantidad in items:
            OrderItem.objects.create(
                order=order,
                product=product,
                cantidad=Decimal(cantidad),
                precio_unitario=product.precio,
            )
        return order

    @staticmethod
    def client_for(user):
        client = APIClient()
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        return client
