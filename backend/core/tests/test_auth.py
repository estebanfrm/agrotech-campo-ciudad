from unittest.mock import patch

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from core.models import User

from .base import PASSWORD, AgrotechTestCase


class RegisterTests(AgrotechTestCase):
    url = "/api/auth/register/"

    def test_register_comprador_returns_token_and_user(self):
        response = self.client.post(
            self.url,
            {"username": "Tienda Nueva", "email": "Tienda@Example.com", "password": "secreta1", "role": "comprador"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["role"], "comprador")
        self.assertEqual(response.data["user"]["email"], "tienda@example.com")
        user = User.objects.get(email="tienda@example.com")
        self.assertTrue(user.check_password("secreta1"))
        self.assertFalse(user.is_staff)

    def test_register_productor(self):
        response = self.client.post(
            self.url,
            {"username": "Finca Nueva", "email": "finca@example.com", "password": "secreta1", "role": "productor"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["role"], "productor")

    def test_cannot_self_register_as_administrador(self):
        response = self.client.post(
            self.url,
            {"username": "Intruso", "email": "intruso@example.com", "password": "secreta1", "role": "administrador"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.data)
        self.assertFalse(User.objects.filter(email="intruso@example.com").exists())

    def test_register_rejects_duplicate_email_ignoring_case(self):
        response = self.client.post(
            self.url,
            {"username": "Otro", "email": "COMPRADOR@test.com", "password": "secreta1"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_register_rejects_duplicate_business_name(self):
        response = self.client.post(
            self.url,
            {"username": "Finca Test", "email": "nueva@example.com", "password": "secreta1"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)

    def test_register_rejects_short_password(self):
        response = self.client.post(
            self.url,
            {"username": "Corta", "email": "corta@example.com", "password": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)


class LoginLogoutTests(AgrotechTestCase):
    def test_login_with_valid_credentials(self):
        response = self.client.post(
            "/api/auth/login/", {"email": "productor@test.com", "password": PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["id"], self.productor.id)
        self.assertEqual(response.data["token"], Token.objects.get(user=self.productor).key)

    def test_login_email_is_case_insensitive(self):
        response = self.client.post(
            "/api/auth/login/", {"email": "Productor@Test.com", "password": PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, 200)

    def test_login_with_wrong_password(self):
        response = self.client.post(
            "/api/auth/login/", {"email": "productor@test.com", "password": "incorrecta"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("token", response.data)

    def test_login_inactive_user_is_rejected(self):
        self.comprador.is_active = False
        self.comprador.save()

        response = self.client.post(
            "/api/auth/login/", {"email": "comprador@test.com", "password": PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_logout_deletes_token(self):
        client = self.client_for(self.comprador)

        response = client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(user=self.comprador).exists())

    def test_logout_requires_authentication(self):
        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, 401)

    @patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"auth": "3/min"})
    def test_login_is_throttled(self):
        client = APIClient()
        payload = {"email": "productor@test.com", "password": "incorrecta"}
        statuses = [client.post("/api/auth/login/", payload, format="json").status_code for _ in range(4)]

        self.assertEqual(statuses[:3], [400, 400, 400])
        self.assertEqual(statuses[3], 429)


class HealthTests(AgrotechTestCase):
    def test_health_endpoint(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_health_ignores_stale_token(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token invalido")

        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
