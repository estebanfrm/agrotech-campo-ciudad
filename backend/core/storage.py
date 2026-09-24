"""Almacenamiento de imágenes en Cloudinary.

Se activa cuando existe la variable de entorno CLOUDINARY_URL
(cloudinary://<api_key>:<api_secret>@<cloud_name>). Así las imágenes
sobreviven a los reinicios de Render, cuyo disco no es persistente.
"""

import os
import posixpath

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class CloudinaryMediaStorage(Storage):
    def __init__(self, folder="agrotech"):
        self.folder = folder
        # El SDK lee CLOUDINARY_URL del entorno; secure=True fuerza URLs https.
        cloudinary.config(secure=True)

    def _save(self, name, content):
        name = name.replace("\\", "/")
        base = posixpath.splitext(posixpath.basename(name))[0]
        content.seek(0)
        # Cloudinary agrega un sufijo aleatorio (unique_filename): dos "foto.png" no se pisan.
        result = cloudinary.uploader.upload(
            content,
            folder=posixpath.join(self.folder, posixpath.dirname(name)).rstrip("/"),
            filename_override=base,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            resource_type="image",
        )
        # Se guarda "public_id.formato" para poder reconstruir la URL después.
        return f"{result['public_id']}.{result['format']}"

    def _open(self, name, mode="rb"):
        raise NotImplementedError("Las imágenes en Cloudinary se leen por URL.")

    def delete(self, name):
        if name:
            cloudinary.uploader.destroy(os.path.splitext(name)[0], resource_type="image", invalidate=True)

    def exists(self, name):
        # Cloudinary genera nombres únicos: nunca hay colisión que resolver.
        return False

    def get_available_name(self, name, max_length=None):
        return name

    def url(self, name):
        public_id, ext = os.path.splitext(name)
        url, _ = cloudinary.utils.cloudinary_url(public_id, format=ext.lstrip(".") or None, secure=True)
        return url

    def size(self, name):
        raise NotImplementedError

    def path(self, name):
        raise NotImplementedError("Cloudinary no tiene rutas locales.")
