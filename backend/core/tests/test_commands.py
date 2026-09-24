import os
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from core.models import Order, Product, User


class SeedDataTests(TestCase):
    def test_seed_creates_demo_data_and_is_idempotent(self):
        call_command("seed_data", stdout=StringIO())
        call_command("seed_data", stdout=StringIO())

        self.assertEqual(User.objects.count(), 5)
        self.assertEqual(Product.objects.count(), 8)
        self.assertEqual(Order.objects.count(), 2)
        admin = User.objects.get(email="admin@agrotech.com")
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.check_password("Agrotech123"))


class EnsureAdminTests(TestCase):
    def run_command(self, **env):
        out = StringIO()
        with patch.dict(os.environ, env, clear=False):
            call_command("ensure_admin", stdout=out)
        return out.getvalue()

    def test_without_env_vars_does_nothing(self):
        with patch.dict(os.environ, {}, clear=True):
            out = StringIO()
            call_command("ensure_admin", stdout=out)

        self.assertIn("no se crea", out.getvalue())
        self.assertFalse(User.objects.exists())

    def test_creates_admin_from_env(self):
        self.run_command(ADMIN_EMAIL="Jefe@Agrotech.com", ADMIN_PASSWORD="SuperSecreta1", ADMIN_USERNAME="Jefe")

        admin = User.objects.get(email="jefe@agrotech.com")
        self.assertEqual(admin.role, User.Roles.ADMINISTRADOR)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password("SuperSecreta1"))

    def test_updates_existing_user_password_and_role(self):
        user = User.objects.create_user("jefe@agrotech.com", "vieja", username="Jefe", role=User.Roles.COMPRADOR)

        self.run_command(ADMIN_EMAIL="jefe@agrotech.com", ADMIN_PASSWORD="NuevaClave1")

        user.refresh_from_db()
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(user.role, User.Roles.ADMINISTRADOR)
        self.assertTrue(user.check_password("NuevaClave1"))

    def test_avoids_username_collision(self):
        User.objects.create_user("otro@agrotech.com", "x", username="Administrador")

        self.run_command(ADMIN_EMAIL="jefe@agrotech.com", ADMIN_PASSWORD="Clave1234")

        self.assertTrue(User.objects.filter(email="jefe@agrotech.com", role=User.Roles.ADMINISTRADOR).exists())
