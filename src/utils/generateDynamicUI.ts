import fs from "fs";
import path from "path";

// ICON MAP for Material UI
const iconMap: Record<string, string> = {
  product: "ShoppingBasket",
  user: "Group",
  role: "AdminPanelSettings",
  category: "Category",
  order: "Assignment",
  brand: "LocalOffer",
  voucher: "CardGiftcard",
  contact: "ContactPhone",
  cms: "Description",
  "user-groups": "SupervisedUserCircle",
  catalogues: "Storefront",
  "admin-users": "Security",
  templates: "ViewQuilt",
  "import-history": "History",
  default: "Apps"
};

function getIcon(sheet: string) {
  const key = sheet.toLowerCase().replace(/\s/g, '-');
  return iconMap[key] || iconMap["default"];
}

function toTitle(sheet:string) {
  return sheet
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
}

function pascalCase(str: string): string {
  return str
    .replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function generateDynamicUI(sheetNames: string[]) {
  const uiBasePath = path.resolve(__dirname, "../../../frontend/src/generated-ui");
  const configPath = path.join(uiBasePath, "config");
  const pagesPath = path.join(uiBasePath, "pages");
  const layoutPath = path.join(uiBasePath, "layout");

  [uiBasePath, configPath, pagesPath, layoutPath].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const iconImports = [...new Set(Object.values(iconMap))];

  const sidebarItems = sheetNames.map((sheet) => {
    const label = toTitle(sheet);
    const icon = getIcon(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, '-') + "s";
    return `  {
    label: "${label} Management",
    icon: <${icon} />,
    path: "/${pathName}",
  },`;
  });

  const dashboardCards = sheetNames.map((sheet) => {
    const label = toTitle(sheet);
    const icon = getIcon(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, '-') + "s";
    
    return `  <Box sx={{ width: { xs: '100%', sm: '33.33%' }, p: 1.5 }}>
    <Card
      onClick={() => navigate("/${pathName}")}
      sx={{
        cursor: "pointer",
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
        borderRadius: 4,
        p: 3,
        height: "160px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: "0 8px 30px -4px rgba(0,0,0,0.1)",
        },
      }}
    >
      <${icon} sx={{ fontSize: 48, color: "#34d399", mb: 2 }} />
      <Typography variant="subtitle1" fontWeight={600} textAlign="center">
        ${label}
      </Typography>
    </Card>
  </Box>`;
  });

  const routeImports = sheetNames.map((sheet) => {
    const pascal = pascalCase(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, '-');
    return `import ${pascal}List from "../../generated-frontend/${pathName}/${pascal}List";
import ${pascal}Form from "../../generated-frontend/${pathName}/${pascal}Form";`;
  });

  const routeComponents = sheetNames.map((sheet) => {
    const pascal = pascalCase(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, '-') + "s";
    return `  <Route path="/${pathName}" element={<${pascal}List />} />
    <Route path="/${pathName}/new" element={<${pascal}Form />} />
  <Route path="/${pathName}/:id/edit" element={<${pascal}Form />} />`;
  });

  fs.writeFileSync(path.join(configPath, "menu.tsx"), `import React from "react";
import { ${iconImports.join(",\n  ")} } from "@mui/icons-material";
export const menuItems = [\n${sidebarItems.join("\n")}\n];`);

  fs.writeFileSync(path.join(configPath, "routes.tsx"), `import React from "react";
import { Route } from "react-router-dom";
${routeImports.join("\n")}
export const dynamicRoutes = (\n  <>\n${routeComponents.join("\n")}\n  </>\n);`);

  fs.writeFileSync(
    path.join(pagesPath, "Dashboard.tsx"),
    `import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Box, Typography } from "@mui/material";
import { ${iconImports.join(",\n  ")} } from "@mui/icons-material";

const Dashboard = () => {
  const navigate = useNavigate();
  return (
    <Box
      display="flex"
      flexWrap="wrap"
      sx={{ mx: -1.5 }}
    >
      ${dashboardCards.join("\n")}
    </Box>
  );
};
export default Dashboard;`
  );

  fs.writeFileSync(path.join(layoutPath, "Layout.tsx"), `import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import { Box } from "@mui/material";

const Layout = () => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f6f8" }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
};
export default Layout;`);

  fs.writeFileSync(path.join(layoutPath, "Sidebar.tsx"), `import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Typography } from "@mui/material";
import { menuItems } from "../config/menu";

const drawerWidth = 260;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '64px' }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Admin Panel
        </Typography>
      </Box>
      <Box sx={{ overflow: 'auto' }}>
        <List sx={{ p: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.label}
                onClick={() => navigate(item.path)}
                sx={{
                  m: 1,
                  borderRadius: 2,
                  color: isActive ? 'white' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(71, 85, 105, 0.5)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(71, 85, 105, 0.3)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};
export default Sidebar;`);

  fs.writeFileSync(path.join(layoutPath, "Header.tsx"), `import React from "react";
import { AppBar, Toolbar, Box, Avatar } from "@mui/material";
import BreadcrumbsComponent from "./Breadcrumbs";

const Header = () => {
  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid #e7eaf3' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <BreadcrumbsComponent />
        <Avatar sx={{ bgcolor: '#34d399' }}>M</Avatar>
      </Toolbar>
    </AppBar>
  );
};
export default Header;`);

  fs.writeFileSync(path.join(layoutPath, "Breadcrumbs.tsx"), `import React from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const BreadcrumbsComponent = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
      <Link component={RouterLink} underline="hover" color="inherit" to="/">
        Home
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = \`/\${pathnames.slice(0, index + 1).join('/')}\`;
        const title = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

        return last ? (
          <Typography color="text.primary" key={to}>{title}</Typography>
        ) : (
          <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
            {title}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};
export default BreadcrumbsComponent;`);
  
  // ===============================================
  // THIS IS THE CORRECTED SECTION FOR THE FOOTER
  // ===============================================
  fs.writeFileSync(path.join(layoutPath, "Footer.tsx"), `import React from "react";
import { Box, Typography } from "@mui/material"; // Fixed: @mui/al -> @mui/material
const Footer = () => {
  return (
    <Box component="footer" sx={{ p: 2, mt: 'auto', backgroundColor: 'white', borderTop: '1px solid #e7eaf3' }}>
      <Typography variant="body2" color="text.secondary" align="center">
        {'© '}
        {new Date().getFullYear()}
        {' Your Company. All Rights Reserved.'}
      </Typography>
    </Box>
  );
};
export default Footer;`);

  console.log("✅ UI files generated with updated professional layout.");
}