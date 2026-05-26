from rest_framework import serializers

from .models import Cashier, Product, Sale, SaleItem, Supplier


class CashierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cashier
        fields = [
            "id",
            "local_id",
            "username",
            "display_name",
            "role",
            "is_active",
            "updated_at",
        ]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")

    class Meta:
        model = Product
        fields = [
            "id",
            "local_id",
            "barcode",
            "name",
            "category",
            "price",
            "cost",
            "stock_qty",
            "reorder_level",
            "supplier",
            "supplier_name",
            "is_active",
            "updated_at",
        ]


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "line_total"]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source="cashier.display_name", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "local_id",
            "receipt_no",
            "cashier",
            "cashier_name",
            "subtotal",
            "tax",
            "total",
            "payment_method",
            "status",
            "created_at",
            "items",
        ]


class SyncPushSerializer(serializers.Serializer):
    cashiers = CashierSerializer(many=True, required=False)
    suppliers = SupplierSerializer(many=True, required=False)
    products = ProductSerializer(many=True, required=False)
    sales = serializers.ListField(child=serializers.DictField(), required=False)
