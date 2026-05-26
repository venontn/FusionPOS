from django.contrib import admin
from django.urls import include, path

from api.monitor_views import monitor_dashboard

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("monitor/", monitor_dashboard, name="monitor"),
]
