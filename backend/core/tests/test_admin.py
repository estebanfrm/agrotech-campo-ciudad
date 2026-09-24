from decimal import Decimal

from core.models import Order, Product

from .base import AgrotechTestCase


class AdminPermissionTests(AgrotechTestCase):
    endpoints = ["/api/admin/users/", "/api/admin/products/", "/api/admin/orders/"]

    def test_admin_can_list_everything(self):
        self.create_product(self.productor, estado=Product.Status.AGOTADO, cantidad=Decimal("0"))
        client = self.client_for(self.admin)

        for url in self.endpoints:
            with self.subTest(url=url):
                self.assertEqual(client.get(url).status_code, 200)

        self.assertEqual(len(client.get("/api/admin/users/").data), 5)
        # El listado admin incluye productos agotados.
        self.assertEqual(len(client.get("/api/admin/products/").data), 1)

    def test_non_admin_roles_are_forbidden(self):
        for user in (self.productor, self.comprador):
            client = self.client_for(user)
            for url in self.endpoints:
                with self.subTest(user=user.email, url=url):
                    self.assertEqual(client.get(url).status_code, 403)

    def test_anonymous_is_rejected(self):
        for url in self.endpoints:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)


class AdminOrderStatusTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        self.tomate = self.create_product(self.productor, nombre="Tomate", cantidad=Decimal("8"))
        self.order = self.create_order(self.comprador, [(self.tomate, "2")])
        self.client_admin = self.client_for(self.admin)
        self.url = f"/api/admin/orders/{self.order.id}/"

    def test_admin_changes_order_status(self):
        response = self.client_admin.patch(self.url, {"estado": "en_camino"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "en_camino")
        self.order.refresh_from_db()
        self.assertEqual(self.order.estado, Order.Status.EN_CAMINO)

    def test_rejects_invalid_status(self):
        response = self.client_admin.patch(self.url, {"estado": "perdido"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_items_are_read_only_for_admin(self):
        response = self.client_admin.patch(
            self.url, {"estado": "confirmado", "items": [{"product_id": self.tomate.id, "cantidad": "1"}]}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["items"][0]["cantidad"]), Decimal("2"))

    def test_cancelling_restores_stock(self):
        response = self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("10"))

    def test_cancelling_makes_sold_out_product_available_again(self):
        self.tomate.cantidad = Decimal("0")
        self.tomate.estado = Product.Status.AGOTADO
        self.tomate.save()

        self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")

        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("2"))
        self.assertEqual(self.tomate.estado, Product.Status.DISPONIBLE)

    def test_cancelling_twice_does_not_restock_twice(self):
        self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")
        self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")

        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("10"))

    def test_cancelled_order_cannot_be_reactivated(self):
        self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")

        response = self.client_admin.patch(self.url, {"estado": "pendiente"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.estado, Order.Status.CANCELADO)

    def test_cancelling_with_deleted_product_does_not_fail(self):
        self.tomate.delete()

        response = self.client_admin.patch(self.url, {"estado": "cancelado"}, format="json")

        self.assertEqual(response.status_code, 200)

    def test_non_admin_cannot_change_status(self):
        response = self.client_for(self.comprador).patch(self.url, {"estado": "entregado"}, format="json")

        self.assertEqual(response.status_code, 403)
