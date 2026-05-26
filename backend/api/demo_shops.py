"""Demo shop registry — IDs 001 onwards."""

DEMO_SHOPS = [
    {
        "shop_id": "001",
        "shop_name": "Harare CBD Supermarket",
        "terminal_id": "T01",
        "city": "Harare",
    },
    {
        "shop_id": "002",
        "shop_name": "Borrowdale Mini Mart",
        "terminal_id": "T01",
        "city": "Harare",
    },
    {
        "shop_id": "003",
        "shop_name": "Bulawayo City Grocers",
        "terminal_id": "T01",
        "city": "Bulawayo",
    },
    {
        "shop_id": "004",
        "shop_name": "Mutare Main Street Pharmacy & Goods",
        "terminal_id": "T01",
        "city": "Mutare",
    },
    {
        "shop_id": "005",
        "shop_name": "Gweru Retail Hub",
        "terminal_id": "T01",
        "city": "Gweru",
    },
    {
        "shop_id": "006",
        "shop_name": "Chitungwiza Community Store",
        "terminal_id": "T01",
        "city": "Chitungwiza",
    },
]


def demo_snapshot(shop: dict, *, revenue: float, transactions: int, low_stock: int) -> dict:
    return {
        "shop_id": shop["shop_id"],
        "shop_name": shop["shop_name"],
        "terminal_id": shop["terminal_id"],
        "timestamp": None,
        "stats": {
            "today_revenue": revenue,
            "today_transactions": transactions,
            "low_stock_count": low_stock,
        },
        "active_sessions": [
            {"display_name": "Front Counter", "role": "cashier"},
        ],
        "recent_sales": [],
        "low_stock": [],
    }
