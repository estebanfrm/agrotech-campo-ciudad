import os

from django.core.management.base import BaseCommand

from core.models import User


class Command(BaseCommand):
    help = (
        "Crea o actualiza el usuario administrador usando las variables de entorno "
        "ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_USERNAME (opcional)."
    )

    def handle(self, *args, **options):
        email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "")
        username = os.getenv("ADMIN_USERNAME", "").strip() or "Administrador"

        if not email or not password:
            self.stdout.write(self.style.WARNING("ADMIN_EMAIL/ADMIN_PASSWORD no definidos: no se crea administrador."))
            return

        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            if User.objects.filter(username=username).exists():
                username = email
            user = User(email=email, username=username)

        user.role = User.Roles.ADMINISTRADOR
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "creado" if created else "actualizado"
        self.stdout.write(self.style.SUCCESS(f"Administrador {email} {action}."))
