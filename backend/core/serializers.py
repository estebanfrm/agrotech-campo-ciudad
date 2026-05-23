from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import Order, OrderItem, Product, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_active", "date_joined")
        read_only_fields = ("id", "is_active", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "role")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        if user.role == User.Roles.ADMINISTRADOR:
            user.is_staff = True
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo.")
        attrs["user"] = user
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    producer = UserSerializer(read_only=True)
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


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(estado=Product.Status.DISPONIBLE),
        source="product",
        write_only=True,
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_id", "cantidad", "precio_unitario", "subtotal")
        read_only_fields = ("id", "product", "precio_unitario", "subtotal")

    def validate(self, attrs):
        product = attrs["product"]
        cantidad = attrs["cantidad"]
        if cantidad <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        if product.cantidad < cantidad:
            raise serializers.ValidationError(
                f"Cantidad no disponible para {product.nombre}. Disponible: {product.cantidad}."
            )
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    buyer_name = serializers.CharField(source="buyer.username", read_only=True)
    items = OrderItemSerializer(many=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

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

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            product = item_data["product"]
            cantidad = item_data["cantidad"]
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
    class Meta(OrderSerializer.Meta):
        read_only_fields = ("id", "buyer", "buyer_name", "total", "created_at", "updated_at")
