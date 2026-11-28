from django.urls import path

from . import views

urlpatterns = [
    path("signup", views.signup, name="signup"),
    path("login", views.login, name="login"),
    path("projects", views.projects, name="projects"),
    path(
        "projects/search",
        views.active_project_by_name,
        name="active-project-by-name",
    ),
]