from collections import OrderedDict
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import serializers

from .models import Order, OrderItem, Product, User

MAX_IMAGE_SIZE = 5 * 1024 * 1024


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_active", "date_joined")
        read_only_fields = ("id", "is_active", "date_joined")


class PublicProducerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=[User.Roles.PRODUCTOR, User.Roles.COMPRADOR],
        default=User.Roles.COMPRADOR,
        error_messages={"invalid_choice": "Solo puedes registrarte como productor o comprador."},
    )

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "role")

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def validate_email(self, value):
        value = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"].strip(),
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        attrs["user"] = user
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    producer = PublicProducerSerializer(read_only=True)
    producer_name = serializers.CharField(source="producer.username", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "producer",
            "producer_name",
            "nombre",
            "categoria",
            "precio",
            "cantidad",
            "ubicacion",
            "fecha_cosecha",
            "descripcion",
            "imagen",
            "image_url",
            "estado",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "producer", "producer_name", "image_url", "created_at", "updated_at")

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        return None

    def validate_precio(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a cero.")
        return value

    def validate_cantidad(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad no puede ser negativa.")
        return value

    def validate_imagen(self, value):
        if value and value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError("La imagen no puede superar 5 MB.")
        return value

    def validate(self, attrs):
        cantidad = attrs.get("cantidad", getattr(self.instance, "cantidad", None))
        estado = attrs.get("estado", getattr(self.instance, "estado", Product.Status.DISPONIBLE))
        if cantidad is not None and cantidad == 0 and estado == Product.Status.DISPONIBLE:
            attrs["estado"] = Product.Status.AGOTADO
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(estado=Product.Status.DISPONIBLE),
        source="product",
        write_only=True,
        error_messages={"does_not_exist": "El producto no existe o no está disponible."},
    )
    subtotal = serializers.DecimalField(max_digits=None, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_id", "cantidad", "precio_unitario", "subtotal")
        read_only_fields = ("id", "product", "precio_unitario", "subtotal")

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    buyer_name = serializers.CharField(source="buyer.username", read_only=True)
    items = OrderItemSerializer(many=True)
    total = serializers.DecimalField(max_digits=None, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "buyer",
            "buyer_name",
            "direccion_entrega",
            "observaciones",
            "estado",
            "items",
            "total",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "buyer", "buyer_name", "estado", "total", "created_at", "updated_at")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("El pedido debe tener al menos un producto.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")

        # Agrupa líneas repetidas del mismo producto para validar el stock total pedido.
        requested = OrderedDict()
        for item_data in items_data:
            product_id = item_data["product"].pk
            requested[product_id] = requested.get(product_id, Decimal("0")) + item_data["cantidad"]

        with transaction.atomic():
            products = Product.objects.select_for_update().in_bulk(list(requested))
            for product_id, cantidad in requested.items():
                product = products.get(product_id)
                if product is None or product.estado != Product.Status.DISPONIBLE:
                    raise serializers.ValidationError({"items": ["Uno de los productos ya no está disponible."]})
                if product.cantidad < cantidad:
                    raise serializers.ValidationError(
                        {"items": [f"Cantidad no disponible para {product.nombre}. Disponible: {product.cantidad}."]}
                    )

            order = Order.objects.create(**validated_data)
            for product_id, cantidad in requested.items():
                product = products[product_id]
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    cantidad=cantidad,
                    precio_unitario=product.precio,
                )
                product.cantidad -= cantidad
                if product.cantidad <= 0:
                    product.estado = Product.Status.AGOTADO
                product.save(update_fields=["cantidad", "estado", "updated_at"])
        return order


class AdminOrderSerializer(OrderSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta(OrderSerializer.Meta):
        read_only_fields = ("id", "buyer", "buyer_name", "items", "total", "created_at", "updated_at")

    def validate_estado(self, value):
        if self.instance and self.instance.estado == Order.Status.CANCELADO and value != Order.Status.CANCELADO:
            raise serializers.ValidationError("Un pedido cancelado no se puede reactivar.")
        return value

    def update(self, instance, validated_data):
        cancelling = (
            validated_data.get("estado") == Order.Status.CANCELADO and instance.estado != Order.Status.CANCELADO
        )
        with transaction.atomic():
            if cancelling:
                self._restock(instance)
            return super().update(instance, validated_data)

    def _restock(self, order):
        items = list(order.items.all())
        product_ids = [item.product_id for item in items if item.product_id]
        products = Product.objects.select_for_update().in_bulk(product_ids)
        for item in items:
            product = products.get(item.product_id)
            if product is None:
                continue
            if product.estado == Product.Status.AGOTADO and product.cantidad <= 0:
                product.estado = Product.Status.DISPONIBLE
            product.cantidad += item.cantidad
            product.save(update_fields=["cantidad", "estado", "updated_at"])
