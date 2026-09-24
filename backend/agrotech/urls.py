from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve


def serve_media(request, path):
    return serve(request, path, document_root=settings.MEDIA_ROOT)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
]

if settings.DEBUG or settings.SERVE_MEDIA:
    media_prefix = settings.MEDIA_URL.strip("/")
    urlpatterns += [re_path(rf"^{media_prefix}/(?P<path>.*)$", serve_media, name="media")]
