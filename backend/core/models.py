from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio.")
        email = self.normalize_email(email)
        if not extra_fields.get("username"):
            extra_fields["username"] = email.split("@")[0]
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "administrador")
        extra_fields.setdefault("username", "Administrador")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser debe tener is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser debe tener is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Roles(models.TextChoices):
        PRODUCTOR = "productor", "Productor"
        COMPRADOR = "comprador", "Comprador"
        ADMINISTRADOR = "administrador", "Administrador"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.COMPRADOR)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


class Product(models.Model):
    class Status(models.TextChoices):
        DISPONIBLE = "disponible", "Disponible"
        AGOTADO = "agotado", "Agotado"

    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="products")
    nombre = models.CharField(max_length=120)
    categoria = models.CharField(max_length=80)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    ubicacion = models.CharField(max_length=140)
    fecha_cosecha = models.DateField()
    descripcion = models.TextField(blank=True)
    imagen = models.ImageField(upload_to="products/", blank=True, null=True)
    estado = models.CharField(max_length=20, choices=Status.choices, default=Status.DISPONIBLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.nombre


class Order(models.Model):
    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        CONFIRMADO = "confirmado", "Confirmado"
        EN_CAMINO = "en_camino", "En camino"
        ENTREGADO = "entregado", "Entregado"
        CANCELADO = "cancelado", "Cancelado"

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    direccion_entrega = models.CharField(max_length=220)
    observaciones = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDIENTE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pedido #{self.id} - {self.buyer.email}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        product_name = self.product.nombre if self.product else "Producto eliminado"
        return f"{product_name} x {self.cantidad}"

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario
