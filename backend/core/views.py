from django.db import connection
from django.db.models import Prefetch
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Order, OrderItem, Product, User
from .permissions import IsAdministrador
from .serializers import (
    AdminOrderSerializer,
    LoginSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    UserSerializer,
)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        connection.ensure_connection()
        return Response({"status": "ok"})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "categories"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.select_related("producer")

        if self.action == "list":
            if user.is_authenticated and user.role == User.Roles.PRODUCTOR and self.request.query_params.get("mine") == "true":
                queryset = queryset.filter(producer=user)
            else:
                queryset = queryset.filter(estado=Product.Status.DISPONIBLE)

            search = self.request.query_params.get("search", "").strip()
            categoria = self.request.query_params.get("categoria", "").strip()
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            if categoria:
                queryset = queryset.filter(categoria__iexact=categoria)
            return queryset

        return queryset

    @action(detail=False, methods=["get"])
    def categories(self, request):
        categorias = (
            Product.objects.filter(estado=Product.Status.DISPONIBLE)
            .order_by("categoria")
            .values_list("categoria", flat=True)
            .distinct()
        )
        return Response(list(categorias))

    def perform_create(self, serializer):
        if self.request.user.role != User.Roles.PRODUCTOR:
            raise PermissionDenied("Solo productores pueden crear productos.")
        serializer.save(producer=self.request.user)

    def perform_update(self, serializer):
        product = serializer.instance
        if self.request.user.role != User.Roles.PRODUCTOR or product.producer != self.request.user:
            raise PermissionDenied("Solo puedes editar tus propios productos.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Roles.ADMINISTRADOR or (user.role == User.Roles.PRODUCTOR and instance.producer == user):
            instance.delete()
            return
        raise PermissionDenied("No tienes permiso para eliminar este producto.")


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Los cambios de estado se hacen desde /api/admin/orders/<id>/.
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related("buyer")
        if user.role == User.Roles.ADMINISTRADOR:
            return queryset.prefetch_related("items__product__producer")
        if user.role == User.Roles.COMPRADOR:
            return queryset.filter(buyer=user).prefetch_related("items__product__producer")
        if user.role == User.Roles.PRODUCTOR:
            # El productor solo ve los pedidos que incluyen sus productos, y solo sus líneas.
            own_items = OrderItem.objects.filter(product__producer=user).select_related("product__producer")
            return (
                queryset.filter(items__product__producer=user)
                .distinct()
                .prefetch_related(Prefetch("items", queryset=own_items))
            )
        return queryset.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Roles.COMPRADOR:
            raise PermissionDenied("Solo compradores pueden crear pedidos.")
        serializer.save(buyer=self.request.user)


class AdminUsersView(generics.ListAPIView):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdministrador]


class AdminProductsView(generics.ListAPIView):
    queryset = Product.objects.select_related("producer").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdministrador]


class AdminOrdersView(generics.ListAPIView):
    queryset = Order.objects.select_related("buyer").prefetch_related("items__product__producer").all()
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdministrador]


class AdminOrderDetailView(generics.RetrieveUpdateAPIView):
    queryset = Order.objects.select_related("buyer").prefetch_related("items__product__producer").all()
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdministrador]
    http_method_names = ["get", "patch", "put", "head", "options"]
