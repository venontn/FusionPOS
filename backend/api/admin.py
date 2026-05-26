from django.contrib import admin

from .models import Cashier, Product, Sale, SaleItem, Shop, Supplier, SyncEvent


@admin.register(Cashier)
class CashierAdmin(admin.ModelAdmin):
    list_display = ("username", "display_name", "role", "is_active")


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "contact_person")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "barcode", "price", "stock_qty", "reorder_level", "is_active")
    search_fields = ("name", "barcode")


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("receipt_no", "cashier", "total", "payment_method", "status", "created_at")
    inlines = [SaleItemInline]


@admin.register(SyncEvent)
class SyncEventAdmin(admin.ModelAdmin):
    list_display = ("entity_type", "local_id", "operation", "synced_at")


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ("shop_id", "shop_name", "terminal_id", "is_online", "last_seen")
