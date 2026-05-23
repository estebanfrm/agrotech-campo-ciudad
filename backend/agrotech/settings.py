import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def csv_env(name, default=""):
    return [value.strip() for value in os.getenv(name, default).split(",") if value.strip()]


SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-agrotech-campo-ciudad-dev-key")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

DEFAULT_ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "agrotech-campo-ciudad.onrender.com",
]

ALLOWED_HOSTS = list(dict.fromkeys(DEFAULT_ALLOWED_HOSTS + csv_env("ALLOWED_HOSTS")))
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "agrotech.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "agrotech.wsgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.config(
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "core.User"

DEFAULT_CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://agrotech-campo-ciudad.vercel.app",
    "https://agrotech-campo-ciudad-qfzf-kq9jtt1qu-estebanfrms-projects.vercel.app",
]

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(DEFAULT_CORS_ALLOWED_ORIGINS + csv_env("CORS_ALLOWED_ORIGINS")))
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "True").lower() == "true"

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

DEFAULT_CSRF_TRUSTED_ORIGINS = [
    "https://agrotech-campo-ciudad.onrender.com",
    "https://agrotech-campo-ciudad.vercel.app",
    "https://agrotech-campo-ciudad-qfzf-kq9jtt1qu-estebanfrms-projects.vercel.app",
]

CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(DEFAULT_CSRF_TRUSTED_ORIGINS + csv_env("CSRF_TRUSTED_ORIGINS")))
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", str(not DEBUG)).lower() == "true"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", "False").lower() == "true"
SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "False").lower() == "true"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}
