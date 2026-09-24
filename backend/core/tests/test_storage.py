from unittest.mock import patch

import cloudinary
from django.core.files.base import ContentFile
from django.test import override_settings

from core.models import Product
from core.storage import CloudinaryMediaStorage

from .base import AgrotechTestCase
from .test_products import PRODUCT_PAYLOAD, ProductImageTests

CLOUDINARY_STORAGES = {
    "default": {"BACKEND": "core.storage.CloudinaryMediaStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
UPLOAD_RESULT = {"public_id": "agrotech/products/foto_x1y2z3", "format": "png"}


class CloudinaryStorageTests(AgrotechTestCase):
    def setUp(self):
        super().setUp()
        cloudinary.config(cloud_name="agrotech-test", api_key="key", api_secret="secret")

    @patch("core.storage.cloudinary.uploader.upload", return_value=UPLOAD_RESULT)
    def test_save_uploads_with_unique_name_in_folder(self, upload):
        name = CloudinaryMediaStorage().save("products/foto.png", ContentFile(b"img", name="foto.png"))

        self.assertEqual(name, "agrotech/products/foto_x1y2z3.png")
        kwargs = upload.call_args.kwargs
        self.assertEqual(kwargs["folder"], "agrotech/products")
        self.assertEqual(kwargs["filename_override"], "foto")
        self.assertTrue(kwargs["unique_filename"])
        self.assertFalse(kwargs["overwrite"])

    def test_url_is_public_https_cloudinary_url(self):
        url = CloudinaryMediaStorage().url("agrotech/products/foto_x1y2z3.png")

        self.assertEqual(url, "https://res.cloudinary.com/agrotech-test/image/upload/v1/agrotech/products/foto_x1y2z3.png")

    @patch("core.storage.cloudinary.uploader.destroy")
    def test_delete_removes_asset_by_public_id(self, destroy):
        CloudinaryMediaStorage().delete("agrotech/products/foto_x1y2z3.png")

        destroy.assert_called_once_with("agrotech/products/foto_x1y2z3", resource_type="image", invalidate=True)

    @override_settings(STORAGES=CLOUDINARY_STORAGES)
    @patch("core.storage.cloudinary.uploader.upload", return_value=UPLOAD_RESULT)
    def test_product_upload_returns_cloudinary_url(self, upload):
        client = self.client_for(self.productor)

        response = client.post(
            "/api/products/", {**PRODUCT_PAYLOAD, "imagen": ProductImageTests.png_file()}, format="multipart"
        )

        self.assertEqual(response.status_code, 201)
        upload.assert_called_once()
        self.assertEqual(
            response.data["image_url"],
            "https://res.cloudinary.com/agrotech-test/image/upload/v1/agrotech/products/foto_x1y2z3.png",
        )
        self.assertEqual(Product.objects.get().imagen.name, "agrotech/products/foto_x1y2z3.png")

    @override_settings(STORAGES=CLOUDINARY_STORAGES)
    @patch("core.storage.cloudinary.uploader.upload")
    def test_invalid_image_is_rejected_before_uploading(self, upload):
        client = self.client_for(self.productor)
        fake = ContentFile(b"no soy una imagen", name="foto.png")

        response = client.post("/api/products/", {**PRODUCT_PAYLOAD, "imagen": fake}, format="multipart")

        self.assertEqual(response.status_code, 400)
        upload.assert_not_called()
