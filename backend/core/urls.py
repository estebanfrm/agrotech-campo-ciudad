from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminOrderDetailView,
    AdminOrdersView,
    AdminProductsView,
    AdminUsersView,
    LoginView,
    LogoutView,
    OrderViewSet,
    ProductViewSet,
    RegisterView,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="products")
router.register("orders", OrderViewSet, basename="orders")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/products/", AdminProductsView.as_view(), name="admin-products"),
    path("admin/orders/", AdminOrdersView.as_view(), name="admin-orders"),
    path("admin/orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("", include(router.urls)),
]
