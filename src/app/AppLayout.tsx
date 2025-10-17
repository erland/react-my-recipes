import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AppBar, Box, Container, Toolbar, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t("app.title")}
          </Typography>
          <Button color={location.pathname.startsWith("/recipes") || location.pathname === "/" ? "inherit" : "secondary"} component={Link} to="/recipes">
            {t("nav.recipes")}
          </Button>
          <Button color={location.pathname.startsWith("/settings") ? "inherit" : "secondary"} component={Link} to="/settings">
            {t("nav.settings")}
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3, flexGrow: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
