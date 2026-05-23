from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Order, OrderItem, Product, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Rol Agrotech", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Rol Agrotech", {"fields": ("email", "role")}),)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("nombre", "categoria", "producer", "precio", "cantidad", "estado")
    list_filter = ("categoria", "estado")
    search_fields = ("nombre", "categoria", "producer__email")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "estado", "created_at")
    list_filter = ("estado",)
    search_fields = ("buyer__email", "direccion_entrega")
    inlines = [OrderItemInline]
