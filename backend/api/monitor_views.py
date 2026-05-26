from datetime import timedelta

from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shop


class ShopHeartbeatView(APIView):
    """Receive live snapshot from desktop POS terminals."""

    def post(self, request):
        shop_id = request.data.get("shop_id")
        if not shop_id:
            return Response({"error": "shop_id required"}, status=400)

        shop, _ = Shop.objects.update_or_create(
            shop_id=shop_id,
            defaults={
                "shop_name": request.data.get("shop_name", shop_id),
                "terminal_id": request.data.get("terminal_id", ""),
                "last_seen": timezone.now(),
                "is_online": True,
                "snapshot": request.data,
            },
        )
        return Response({"ok": True, "shop": shop.shop_id})


class ShopListView(APIView):
    def get(self, request):
        cutoff = timezone.now() - timedelta(minutes=2)
        shops = Shop.objects.all()
        data = []
        for shop in shops:
            online = shop.last_seen >= cutoff
            if shop.is_online != online:
                shop.is_online = online
                shop.save(update_fields=["is_online"])
            data.append(
                {
                    "shop_id": shop.shop_id,
                    "shop_name": shop.shop_name,
                    "terminal_id": shop.terminal_id,
                    "is_online": online,
                    "last_seen": shop.last_seen.isoformat(),
                    "snapshot": shop.snapshot,
                }
            )
        return Response(data)


def monitor_dashboard(request):
    return render(request, "monitor.html")


class ReportDownloadView(APIView):
    """Cloud-side report placeholder; desktop exports locally."""

    def get(self, request):
        period = request.query_params.get("period", "daily")
        return Response(
            {
                "message": "Use desktop Reports page to export CSV.",
                "period": period,
            }
        )
