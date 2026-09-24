from decimal import Decimal

from core.models import Order, OrderItem, Product

from .base import AgrotechTestCase


class CreateOrderTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        self.tomate = self.create_product(self.productor, nombre="Tomate", precio=Decimal("3000"), cantidad=Decimal("60"))
        self.mora = self.create_product(self.otro_productor, nombre="Mora", precio=Decimal("5000"), cantidad=Decimal("10"))
        self.client_comprador = self.client_for(self.comprador)

    def post_order(self, items, client=None):
        client = client or self.client_comprador
        return client.post(
            "/api/orders/",
            {"direccion_entrega": "Calle 45 #12-30", "observaciones": "Mañana", "items": items},
            format="json",
        )

    def test_buyer_creates_order_and_stock_is_discounted(self):
        response = self.post_order(
            [{"product_id": self.tomate.id, "cantidad": "10"}, {"product_id": self.mora.id, "cantidad": "2"}]
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["estado"], Order.Status.PENDIENTE)
        self.assertEqual(Decimal(response.data["total"]), Decimal("40000.00"))
        self.tomate.refresh_from_db()
        self.mora.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("50"))
        self.assertEqual(self.mora.cantidad, Decimal("8"))

    def test_unit_price_is_taken_from_product_not_from_client(self):
        response = self.post_order([{"product_id": self.tomate.id, "cantidad": "1", "precio_unitario": "1"}])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(response.data["items"][0]["precio_unitario"]), Decimal("3000.00"))

    def test_buying_all_stock_marks_product_sold_out(self):
        response = self.post_order([{"product_id": self.mora.id, "cantidad": "10"}])

        self.assertEqual(response.status_code, 201)
        self.mora.refresh_from_db()
        self.assertEqual(self.mora.cantidad, Decimal("0"))
        self.assertEqual(self.mora.estado, Product.Status.AGOTADO)

    def test_rejects_quantity_above_stock(self):
        response = self.post_order([{"product_id": self.mora.id, "cantidad": "11"}])

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.mora.refresh_from_db()
        self.assertEqual(self.mora.cantidad, Decimal("10"))

    def test_duplicated_lines_cannot_exceed_stock(self):
        response = self.post_order(
            [{"product_id": self.tomate.id, "cantidad": "50"}, {"product_id": self.tomate.id, "cantidad": "50"}]
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("60"))

    def test_duplicated_lines_are_merged(self):
        response = self.post_order(
            [{"product_id": self.tomate.id, "cantidad": "5"}, {"product_id": self.tomate.id, "cantidad": "5"}]
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(Decimal(response.data["items"][0]["cantidad"]), Decimal("10"))
        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("50"))

    def test_failed_order_does_not_touch_any_stock(self):
        response = self.post_order(
            [{"product_id": self.tomate.id, "cantidad": "5"}, {"product_id": self.mora.id, "cantidad": "999"}]
        )

        self.assertEqual(response.status_code, 400)
        self.tomate.refresh_from_db()
        self.assertEqual(self.tomate.cantidad, Decimal("60"))
        self.assertFalse(OrderItem.objects.exists())

    def test_rejects_empty_order(self):
        response = self.post_order([])

        self.assertEqual(response.status_code, 400)
        self.assertIn("items", response.data)
        self.assertFalse(Order.objects.exists())

    def test_rejects_zero_or_negative_quantity(self):
        response = self.post_order([{"product_id": self.tomate.id, "cantidad": "0"}])

        self.assertEqual(response.status_code, 400)

    def test_rejects_sold_out_product(self):
        agotado = self.create_product(self.productor, nombre="Cebolla", cantidad=Decimal("0"), estado=Product.Status.AGOTADO)

        response = self.post_order([{"product_id": agotado.id, "cantidad": "1"}])

        self.assertEqual(response.status_code, 400)

    def test_producer_cannot_create_order(self):
        response = self.post_order([{"product_id": self.mora.id, "cantidad": "1"}], client=self.client_for(self.productor))

        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_create_order(self):
        response = self.client.post("/api/orders/", {"direccion_entrega": "x", "items": []}, format="json")

        self.assertEqual(response.status_code, 401)

    def test_buyer_cannot_set_order_status_on_create(self):
        response = self.client_comprador.post(
            "/api/orders/",
            {
                "direccion_entrega": "Calle 1",
                "estado": "entregado",
                "items": [{"product_id": self.tomate.id, "cantidad": "1"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["estado"], Order.Status.PENDIENTE)


class OrderVisibilityTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        self.tomate = self.create_product(self.productor, nombre="Tomate")
        self.mora = self.create_product(self.otro_productor, nombre="Mora", precio=Decimal("5000"))
        self.order = self.create_order(self.comprador, [(self.tomate, "2"), (self.mora, "3")])
        self.other_order = self.create_order(self.otro_comprador, [(self.mora, "1")])

    def test_buyer_sees_only_own_orders(self):
        response = self.client_for(self.comprador).get("/api/orders/")

        self.assertEqual([order["id"] for order in response.data], [self.order.id])

    def test_buyer_cannot_see_other_buyers_order(self):
        response = self.client_for(self.comprador).get(f"/api/orders/{self.other_order.id}/")

        self.assertEqual(response.status_code, 404)

    def test_producer_sees_orders_with_own_products_and_only_own_lines(self):
        response = self.client_for(self.productor).get("/api/orders/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([order["id"] for order in response.data], [self.order.id])
        items = response.data[0]["items"]
        self.assertEqual([item["product"]["nombre"] for item in items], ["Tomate"])
        self.assertEqual(Decimal(response.data[0]["total"]), Decimal("6000.00"))

    def test_other_producer_sees_both_orders(self):
        response = self.client_for(self.otro_productor).get("/api/orders/")

        self.assertEqual({order["id"] for order in response.data}, {self.order.id, self.other_order.id})

    def test_admin_sees_all_orders(self):
        response = self.client_for(self.admin).get("/api/orders/")

        self.assertEqual(len(response.data), 2)

    def test_buyer_cannot_update_or_delete_orders(self):
        client = self.client_for(self.comprador)

        patch = client.patch(f"/api/orders/{self.order.id}/", {"estado": "entregado"}, format="json")
        delete = client.delete(f"/api/orders/{self.order.id}/")

        self.assertEqual(patch.status_code, 405)
        self.assertEqual(delete.status_code, 405)
        self.order.refresh_from_db()
        self.assertEqual(self.order.estado, Order.Status.PENDIENTE)

    def test_order_survives_product_deletion(self):
        self.tomate.delete()

        response = self.client_for(self.comprador).get(f"/api/orders/{self.order.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(None, [item["product"] for item in response.data["items"]])
