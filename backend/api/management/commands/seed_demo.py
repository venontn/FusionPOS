import hashlib
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from django.utils import timezone

from api.demo_shops import DEMO_SHOPS, demo_snapshot
from api.models import Cashier, Product, Shop, Supplier


def simple_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class Command(BaseCommand):
    help = "Seed demo cashiers, suppliers, and products"

    def handle(self, *args, **options):
        admin, _ = Cashier.objects.update_or_create(
            username="admin",
            defaults={
                "local_id": 1,
                "password_hash": simple_hash("admin123"),
                "display_name": "Store Admin",
                "role": Cashier.Role.ADMIN,
            },
        )
        cashier, _ = Cashier.objects.update_or_create(
            username="cashier",
            defaults={
                "local_id": 2,
                "password_hash": simple_hash("cashier123"),
                "display_name": "Front Counter",
                "role": Cashier.Role.CASHIER,
            },
        )

        supplier, _ = Supplier.objects.update_or_create(
            local_id=1,
            defaults={
                "name": "Harare Wholesale Traders",
                "contact_person": "T. Moyo",
                "phone": "+263 77 000 0000",
                "email": "orders@example.co.zw",
            },
        )

        products = [
            ("8901001", "Maize Meal 10kg", "Grocery", "8.50", 120, 20),
            ("8901002", "Cooking Oil 2L", "Grocery", "6.75", 80, 15),
            ("8901003", "Fresh Bread Loaf", "Bakery", "1.20", 45, 10),
            ("8901004", "Bottled Water 500ml", "Beverages", "0.80", 200, 50),
            ("8901005", "Liquid Soap 750ml", "Household", "3.40", 35, 8),
            ("8901006", "Rice 2kg", "Grocery", "4.25", 60, 12),
            ("8901007", "Sugar 2kg", "Grocery", "3.90", 55, 12),
            ("8901008", "Toothpaste 100g", "Personal Care", "2.10", 40, 10),
        ]

        for idx, (barcode, name, category, price, stock, reorder) in enumerate(products, start=1):
            Product.objects.update_or_create(
                local_id=idx,
                defaults={
                    "barcode": barcode,
                    "name": name,
                    "category": category,
                    "price": Decimal(price),
                    "cost": Decimal(price) * Decimal("0.7"),
                    "stock_qty": stock,
                    "reorder_level": reorder,
                    "supplier": supplier,
                },
            )

        demo_stats = [
            (412.5, 28, 2),
            (189.0, 14, 1),
            (356.75, 22, 3),
            (98.2, 9, 0),
            (241.0, 17, 1),
            (167.4, 12, 2),
        ]
        now = timezone.now()
        for shop_def, (revenue, txns, low) in zip(DEMO_SHOPS, demo_stats, strict=True):
            snap = demo_snapshot(shop_def, revenue=revenue, transactions=txns, low_stock=low)
            snap["timestamp"] = now.isoformat()
            Shop.objects.update_or_create(
                shop_id=shop_def["shop_id"],
                defaults={
                    "shop_name": shop_def["shop_name"],
                    "terminal_id": shop_def["terminal_id"],
                    "last_seen": now,
                    "is_online": True,
                    "snapshot": snap,
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"  Admin login: admin / admin123 (id={admin.id})")
        self.stdout.write(f"  Cashier login: cashier / cashier123 (id={cashier.id})")
        self.stdout.write("  Demo shops on monitor (001–006):")
        for s in DEMO_SHOPS:
            self.stdout.write(f"    {s['shop_id']} — {s['shop_name']} ({s['city']})")
