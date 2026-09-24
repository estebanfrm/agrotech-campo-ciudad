import io
import shutil
import tempfile
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from core.models import Product

from .base import AgrotechTestCase

PRODUCT_PAYLOAD = {
    "nombre": "Papa criolla",
    "categoria": "Tuberculos",
    "precio": "2800.00",
    "cantidad": "200.00",
    "ubicacion": "Ventaquemada, Boyacá",
    "fecha_cosecha": "2026-09-20",
    "descripcion": "Papa lavada",
}


class CatalogTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        self.tomate = self.create_product(self.productor, nombre="Tomate chonto", categoria="Hortalizas")
        self.mora = self.create_product(self.otro_productor, nombre="Mora de Castilla", categoria="Frutas")
        self.agotado = self.create_product(
            self.productor, nombre="Lechuga", categoria="Hortalizas", cantidad=Decimal("0"), estado=Product.Status.AGOTADO
        )

    def test_public_catalog_lists_only_available_products(self):
        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, 200)
        names = {item["nombre"] for item in response.data}
        self.assertEqual(names, {"Tomate chonto", "Mora de Castilla"})

    def test_catalog_does_not_expose_producer_private_data(self):
        response = self.client.get("/api/products/")

        producer = response.data[0]["producer"]
        self.assertEqual(set(producer), {"id", "username"})

    def test_catalog_search_by_name(self):
        response = self.client.get("/api/products/", {"search": "mora"})

        self.assertEqual([item["nombre"] for item in response.data], ["Mora de Castilla"])

    def test_catalog_filter_by_category_is_case_insensitive(self):
        response = self.client.get("/api/products/", {"categoria": "hortalizas"})

        self.assertEqual([item["nombre"] for item in response.data], ["Tomate chonto"])

    def test_categories_endpoint_lists_available_categories(self):
        response = self.client.get("/api/products/categories/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, ["Frutas", "Hortalizas"])

    def test_product_detail_is_public(self):
        response = self.client.get(f"/api/products/{self.tomate.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["producer_name"], "Finca Test")

    def test_producer_mine_filter_includes_sold_out_products(self):
        client = self.client_for(self.productor)

        response = client.get("/api/products/", {"mine": "true"})

        names = {item["nombre"] for item in response.data}
        self.assertEqual(names, {"Tomate chonto", "Lechuga"})

    def test_mine_filter_is_ignored_for_buyers(self):
        client = self.client_for(self.comprador)

        response = client.get("/api/products/", {"mine": "true"})

        self.assertEqual(len(response.data), 2)


class ProductManagementTests(AgrotechTestCase):
    def test_producer_creates_product(self):
        client = self.client_for(self.productor)

        response = client.post("/api/products/", PRODUCT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 201)
        product = Product.objects.get(id=response.data["id"])
        self.assertEqual(product.producer, self.productor)
        self.assertEqual(product.estado, Product.Status.DISPONIBLE)

    def test_anonymous_cannot_create_product(self):
        response = self.client.post("/api/products/", PRODUCT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 401)

    def test_buyer_cannot_create_product(self):
        client = self.client_for(self.comprador)

        response = client.post("/api/products/", PRODUCT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Product.objects.exists())

    def test_rejects_non_positive_price_and_negative_quantity(self):
        client = self.client_for(self.productor)
        payload = {**PRODUCT_PAYLOAD, "precio": "0", "cantidad": "-1"}

        response = client.post("/api/products/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("precio", response.data)
        self.assertIn("cantidad", response.data)

    def test_zero_quantity_marks_product_as_sold_out(self):
        client = self.client_for(self.productor)
        payload = {**PRODUCT_PAYLOAD, "cantidad": "0"}

        response = client.post("/api/products/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["estado"], Product.Status.AGOTADO)

    def test_producer_updates_own_product(self):
        product = self.create_product(self.productor)
        client = self.client_for(self.productor)

        response = client.patch(f"/api/products/{product.id}/", {"precio": "3500.00"}, format="json")

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.precio, Decimal("3500.00"))

    def test_producer_cannot_update_other_producers_product(self):
        product = self.create_product(self.otro_productor)
        client = self.client_for(self.productor)

        response = client.patch(f"/api/products/{product.id}/", {"precio": "1.00"}, format="json")

        self.assertEqual(response.status_code, 403)
        product.refresh_from_db()
        self.assertEqual(product.precio, Decimal("3000.00"))

    def test_admin_cannot_edit_products(self):
        product = self.create_product(self.productor)
        client = self.client_for(self.admin)

        response = client.patch(f"/api/products/{product.id}/", {"precio": "1.00"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_producer_deletes_own_product(self):
        product = self.create_product(self.productor)
        client = self.client_for(self.productor)

        response = client.delete(f"/api/products/{product.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(id=product.id).exists())

    def test_producer_cannot_delete_other_producers_product(self):
        product = self.create_product(self.otro_productor)
        client = self.client_for(self.productor)

        response = client.delete(f"/api/products/{product.id}/")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Product.objects.filter(id=product.id).exists())

    def test_buyer_cannot_delete_product(self):
        product = self.create_product(self.productor)
        client = self.client_for(self.comprador)

        response = client.delete(f"/api/products/{product.id}/")

        self.assertEqual(response.status_code, 403)

    def test_admin_deletes_any_product(self):
        product = self.create_product(self.productor)
        client = self.client_for(self.admin)

        response = client.delete(f"/api/products/{product.id}/")

        self.assertEqual(response.status_code, 204)


class ProductImageTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        self.media_root = tempfile.mkdtemp()
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root)
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)
        super().tearDown()

    @staticmethod
    def png_file(name="foto.png"):
        buffer = io.BytesIO()
        Image.new("RGB", (4, 4), "green").save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_upload_image_returns_absolute_url(self):
        client = self.client_for(self.productor)

        response = client.post("/api/products/", {**PRODUCT_PAYLOAD, "imagen": self.png_file()}, format="multipart")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["image_url"].startswith("http://testserver/media/products/"))
        image_response = self.client.get(response.data["image_url"].replace("http://testserver", ""))
        self.assertEqual(image_response.status_code, 200)

    def test_rejects_non_image_file(self):
        client = self.client_for(self.productor)
        fake = SimpleUploadedFile("foto.png", b"no soy una imagen", content_type="image/png")

        response = client.post("/api/products/", {**PRODUCT_PAYLOAD, "imagen": fake}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen", response.data)
