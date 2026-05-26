from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cashier, Product, Sale, SaleItem, Supplier, SyncEvent
from .serializers import (
    ProductSerializer,
    SaleSerializer,
    SupplierSerializer,
    SyncPushSerializer,
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related("supplier")
    serializer_class = ProductSerializer

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        items = self.get_queryset().filter(stock_qty__lte=F("reorder_level"))
        return Response(ProductSerializer(items, many=True).data)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.prefetch_related("items").select_related("cashier")
    serializer_class = SaleSerializer


class DashboardView(APIView):
    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=6)

        today_sales = Sale.objects.filter(created_at__date=today, status=Sale.Status.COMPLETED)
        today_total = today_sales.aggregate(total=Sum("total"))["total"] or Decimal("0")
        today_count = today_sales.count()

        low_stock = Product.objects.filter(
            is_active=True, stock_qty__lte=F("reorder_level")
        ).count()

        daily = (
            Sale.objects.filter(created_at__date__gte=week_ago, status=Sale.Status.COMPLETED)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"), transactions=Count("id"))
            .order_by("day")
        )

        top_products = (
            SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED)
            .values("product_name")
            .annotate(qty=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-qty")[:5]
        )

        return Response(
            {
                "today_revenue": str(today_total),
                "today_transactions": today_count,
                "low_stock_count": low_stock,
                "daily_revenue": [
                    {
                        "date": row["day"].isoformat(),
                        "revenue": str(row["revenue"] or 0),
                        "transactions": row["transactions"],
                    }
                    for row in daily
                ],
                "top_products": list(top_products),
            }
        )


class SyncPushView(APIView):
    """Accept batched entities from offline desktop clients."""

    def post(self, request):
        serializer = SyncPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        counts = {"suppliers": 0, "products": 0, "sales": 0}

        for row in data.get("suppliers", []):
            Supplier.objects.update_or_create(
                local_id=row.get("local_id") or row.get("id"),
                defaults={
                    "name": row["name"],
                    "contact_person": row.get("contact_person", ""),
                    "phone": row.get("phone", ""),
                    "email": row.get("email", ""),
                    "address": row.get("address", ""),
                },
            )
            counts["suppliers"] += 1

        for row in data.get("products", []):
            supplier = None
            if row.get("supplier_id"):
                supplier = Supplier.objects.filter(local_id=row["supplier_id"]).first()
            Product.objects.update_or_create(
                local_id=row.get("local_id") or row.get("id"),
                defaults={
                    "barcode": row.get("barcode", ""),
                    "name": row["name"],
                    "category": row.get("category", ""),
                    "price": row["price"],
                    "cost": row.get("cost", 0),
                    "stock_qty": row.get("stock_qty", 0),
                    "reorder_level": row.get("reorder_level", 5),
                    "supplier": supplier,
                    "is_active": row.get("is_active", True),
                },
            )
            counts["products"] += 1

        for sale_data in data.get("sales", []):
            if Sale.objects.filter(receipt_no=sale_data["receipt_no"]).exists():
                continue
            cashier = Cashier.objects.filter(local_id=sale_data.get("cashier_id")).first()
            if not cashier:
                continue
            sale = Sale.objects.create(
                local_id=sale_data.get("local_id"),
                receipt_no=sale_data["receipt_no"],
                cashier=cashier,
                subtotal=sale_data["subtotal"],
                tax=sale_data.get("tax", 0),
                total=sale_data["total"],
                payment_method=sale_data["payment_method"],
                status=sale_data.get("status", Sale.Status.COMPLETED),
                created_at=sale_data["created_at"],
            )
            for item in sale_data.get("items", []):
                product = Product.objects.filter(local_id=item.get("product_id")).first()
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    product_name=item["product_name"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                    line_total=item["line_total"],
                )
            counts["sales"] += 1
            SyncEvent.objects.create(
                entity_type="sale",
                local_id=sale.local_id or sale.id,
                operation="create",
                payload={"receipt_no": sale.receipt_no},
            )

        return Response({"ok": True, "synced": counts})


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "fusionpos-api"})
