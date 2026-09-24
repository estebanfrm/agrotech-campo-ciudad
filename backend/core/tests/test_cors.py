from django.test import SimpleTestCase


class CorsTests(SimpleTestCase):
    def allowed_origin(self, origin):
        response = self.client.get("/api/health/", headers={"origin": origin})
        return response.headers.get("access-control-allow-origin")

    def test_allows_vercel_urls_of_the_project(self):
        origins = [
            "https://agrotech-campo-ciudad.vercel.app",
            "https://agrotech-campo-ciudad-qfzf.vercel.app",
            # URL de un deploy nuevo y URL por rama de Git.
            "https://agrotech-campo-ciudad-qfzf-a1b2c3d4e-estebanfrms-projects.vercel.app",
            "https://agrotech-campo-ciudad-qfzf-git-main-estebanfrms-projects.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
        ]
        for origin in origins:
            with self.subTest(origin=origin):
                self.assertEqual(self.allowed_origin(origin), origin)

    def test_rejects_other_origins(self):
        origins = [
            "https://agrotech-campo-ciudad-qfzf-a1b2c3d4e-otro-equipo.vercel.app",
            "https://agrotech-campo-ciudad-estebanfrms-projects.vercel.app.evil.com",
            "https://evil.com",
            "http://agrotech-campo-ciudad.vercel.app",
        ]
        for origin in origins:
            with self.subTest(origin=origin):
                self.assertIsNone(self.allowed_origin(origin))
