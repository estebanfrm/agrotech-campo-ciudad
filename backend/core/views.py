from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, Product, User
from .permissions import IsAdministrador
from .serializers import (
    AdminOrderSerializer,
    LoginSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(id=response.data["id"])
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
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

            search = self.request.query_params.get("search")
            categoria = self.request.query_params.get("categoria")
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            if categoria:
                queryset = queryset.filter(categoria__iexact=categoria)
            return queryset

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != User.Roles.PRODUCTOR:
            raise PermissionDenied("Solo productores pueden crear productos.")
        serializer.save(producer=self.request.user)

    def perform_update(self, serializer):
        product = self.get_object()
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

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related("buyer").prefetch_related("items__product__producer")
        if user.role == User.Roles.ADMINISTRADOR:
            return queryset
        if user.role == User.Roles.COMPRADOR:
            return queryset.filter(buyer=user)
        return queryset.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Roles.COMPRADOR:
            raise PermissionDenied("Solo compradores pueden crear pedidos.")
        serializer.save(buyer=self.request.user)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Solo administradores pueden cambiar estados desde el panel admin."}, status=403)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


class AdminUsersView(generics.ListAPIView):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdministrador]


class AdminProductsView(generics.ListAPIView):
    queryset = Product.objects.select_related("producer").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdministrador]

    @action(detail=True, methods=["delete"])
    def delete_product(self, request, pk=None):
        product = self.get_object()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminOrdersView(generics.ListAPIView):
    queryset = Order.objects.select_related("buyer").prefetch_related("items__product__producer").all()
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdministrador]


class AdminOrderDetailView(generics.RetrieveUpdateAPIView):
    queryset = Order.objects.select_related("buyer").prefetch_related("items__product__producer").all()
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdministrador]
    http_method_names = ["get", "patch", "put", "head", "options"]
