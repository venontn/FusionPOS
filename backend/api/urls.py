from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .monitor_views import ReportDownloadView, ShopHeartbeatView, ShopListView
from .views import DashboardView, HealthView, ProductViewSet, SaleViewSet, SupplierViewSet, SyncPushView

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("sales", SaleViewSet, basename="sale")

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("dashboard/", DashboardView.as_view()),
    path("sync/push/", SyncPushView.as_view()),
    path("shops/heartbeat/", ShopHeartbeatView.as_view()),
    path("shops/", ShopListView.as_view()),
    path("reports/export/", ReportDownloadView.as_view()),
    path("", include(router.urls)),
]
