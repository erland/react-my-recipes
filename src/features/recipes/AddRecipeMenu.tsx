import React from "react";
import { Box, Tooltip, IconButton, Menu, MenuItem } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

type AddRecipeMenuProps = {
  onCreateManual: () => void;
  onImportUrl: () => void;
  onImportPaste: () => void;
};

export default function AddRecipeMenu({
  onCreateManual,
  onImportUrl,
  onImportPaste,
}: AddRecipeMenuProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const open = (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const close = () => setAnchor(null);

  return (
    <Box sx={{ textAlign: "center" }}>
      <Tooltip title={t("recipes.addNew")}>
        <IconButton color="primary" size="large" onClick={open}>
          <Add />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            onCreateManual();
          }}
        >
          {t("recipes.createManual")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onImportUrl();
          }}
        >
          {t("recipes.importFromUrl")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onImportPaste();
          }}
        >
          {t("recipes.importFromPaste")}
        </MenuItem>
      </Menu>
    </Box>
  );
}