// src/utils/generateDynamicUI.ts

import fs from "fs";
import path from "path";

// ICON MAP for lucide-react, matching the screenshot's style
const iconMap: Record<string, string> = {
  // Main Groups
  "user management": "Users",
  "catalogue management": "ShoppingCart",
  "voucher management": "Ticket",
  "order management": "ClipboardList",
  "admin user management": "Shield",
  "contact us management": "Phone",
  "cms pages management": "FileText",
  templates: "LayoutTemplate",
  "import history": "History",

  // Individual sheets
  "user groups": "Users2",
  users: "User",
  catalogues: "Store",
  categories: "Layers3",
  brands: "Award",
  products: "Package",
  vouchers: "Gift",
  orders: "ClipboardCheck",
  "admin users": "ShieldCheck",
  "contact us": "PhoneCall",
  "cms pages": "Newspaper",

  // Default
  default: "AppWindow",
};

// Defines the sidebar structure and groups sheets by keywords
const menuConfig = [
  { label: "User Management", keywords: ["user", "group", "role"] },
  {
    label: "Catalogue Management",
    keywords: ["catalogue", "category", "brand", "product"],
  },
  { label: "Voucher Management", keywords: ["voucher"] },
  { label: "Order Management", keywords: ["order"] },
  { label: "Admin User Management", keywords: ["admin user"] },
  { label: "Contact Us Management", keywords: ["contact us"] },
  { label: "CMS Pages Management", keywords: ["cms page"] },
  { label: "Templates", keywords: ["template"] },
  { label: "Import History", keywords: ["import history"] },
];

function getIcon(name: string): string {
  const key = name.toLowerCase().replace(/\s/g, "-");
  return iconMap[key] || iconMap["default"];
}

function toTitle(sheet: string): string {
  return sheet
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pascalCase(str: string): string {
  return str
    .replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function generateDynamicUI(sheetNames: string[]) {
  const uiBasePath = path.resolve(
    __dirname,
    "../../../frontend/src/generated-ui"
  );
  const configPath = path.join(uiBasePath, "config");
  const pagesPath = path.join(uiBasePath, "pages");
  const layoutPath = path.join(uiBasePath, "layout");

  [uiBasePath, configPath, pagesPath, layoutPath].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sidebarItems: any[] = [];
  const assignedSheets = new Set<string>();

  sidebarItems.push({
    isTitle: true,
    label: "Quick Links",
    path: "/dashboard",
  });

  menuConfig.forEach((group) => {
    const children = sheetNames
      .filter(
        (name) =>
          !assignedSheets.has(name) &&
          group.keywords.some((kw) => name.toLowerCase().includes(kw))
      )
      .map((sheet) => {
        assignedSheets.add(sheet);
        return {
          label: toTitle(sheet),
          path: `/${sheet.toLowerCase().replace(/\s/g, "-")}`,
        };
      });

    if (children.length > 0) {
      sidebarItems.push({
        label: group.label,
        icon: getIcon(group.label),
        children: children,
      });
    }
  });

  sheetNames.forEach((sheet) => {
    if (!assignedSheets.has(sheet)) {
      sidebarItems.push({
        label: toTitle(sheet),
        icon: getIcon(sheet),
        path: `/${sheet.toLowerCase().replace(/\s/g, "-")}`,
      });
    }
  });

  const allIcons = new Set<string>(Object.values(iconMap));
  sidebarItems.forEach((item) => {
    if (item.icon) allIcons.add(item.icon);
  });

  const standardIcons = [
    ...allIcons,
    "ChevronsUpDown",
    "Plus",
    "FileDown",
    "Check",
    "Eye",
    "Edit",
    "Trash2",
    "ChevronLeft",
    "ChevronRight",
    "Clock",
    "UploadCloud",
  ];
  const uniqueStandardIcons = [...new Set(standardIcons)].filter(
    (icon) => icon !== "Link"
  );
  const lucideImportList = [...uniqueStandardIcons, "Link as LinkIcon"];
  const iconMapKeys = [...uniqueStandardIcons, "LinkIcon"];

  const dashboardCards = sheetNames.map((sheet) => {
    const label = toTitle(sheet);
    const icon = getIcon(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, "-");
    return `  <div onClick={() => navigate("/${pathName}")} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
      <${icon} style={{ height: '36px', width: '36px', color: '#16a34a', marginBottom: '12px' }} strokeWidth={1.5}/>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#333', textAlign: 'center' }}>${label}</span>
    </div>`;
  });

  const routeImports = sheetNames.map((sheet) => {
    const pascal = pascalCase(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, "-");
    return `import ${pascal}List from "../../generated-frontend/${pathName}/${pascal}List";\nimport ${pascal}Form from "../../generated-frontend/${pathName}/${pascal}Form";`;
  });

  const routeComponents = sheetNames.map((sheet) => {
    const pascal = pascalCase(sheet);
    const pathName = sheet.toLowerCase().replace(/\s/g, "-");
    return `  <Route path="/${pathName}" element={<${pascal}List />} />
    <Route path="/${pathName}/new" element={<${pascal}Form />} />
    <Route path="/${pathName}/:id/edit" element={<${pascal}Form />} />`;
  });

  fs.writeFileSync(
    path.join(configPath, "menu.ts"),
    `export const menuItems = ${JSON.stringify(sidebarItems, null, 2)};`
  );
  fs.writeFileSync(
    path.join(configPath, "routes.tsx"),
    `import React from "react";\nimport { Route } from "react-router-dom";\n${routeImports.join(
      "\n"
    )}\nexport const dynamicRoutes = (\n  <>\n${routeComponents.join(
      "\n"
    )}\n  </>\n);`
  );

  fs.writeFileSync(
    path.join(pagesPath, "Dashboard.tsx"),
    `import React from "react";\nimport { useNavigate } from "react-router-dom";\nimport { ${lucideImportList.join(
      ", "
    )} } from "lucide-react";\n\nconst Dashboard = () => {\n  const navigate = useNavigate();\n  return (\n    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>\n      ${dashboardCards.join(
      "\n"
    )}\n    </div>\n  );\n};\nexport default Dashboard;`
  );

  fs.writeFileSync(
    path.join(layoutPath, "Layout.tsx"),
    `import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        button, input, textarea, select { font-family: inherit; }
      \`}</style>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main style={{ flexGrow: 1, padding: '24px', overflowY: 'auto' }}>
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};
export default Layout;`
  );

  fs.writeFileSync(
    path.join(layoutPath, "Sidebar.tsx"),
    `import React, { useState, useEffect } from "react";\nimport { Link, useLocation } from "react-router-dom";\nimport * as Collapsible from '@radix-ui/react-collapsible';\nimport { menuItems } from "../config/menu";\nimport { ${lucideImportList.join(
      ", "
    )} } from "lucide-react";\n\nconst iconMap = { ${iconMapKeys
      .map((icon) => `${icon}: ${icon}`)
      .join(
        ", "
      )} };\n\nconst Sidebar = () => {\n  const location = useLocation();\n  const [openItems, setOpenItems] = useState([]);\n\n  useEffect(() => {\n    const activeParent = menuItems.find(item => item.children?.some(child => location.pathname.startsWith(child.path)));\n    if (activeParent && !openItems.includes(activeParent.label)) {\n      setOpenItems([activeParent.label]);\n    }\n  }, [location.pathname]);\n\n  const toggleItem = (label) => {\n    setOpenItems(prev => prev.includes(label) ? prev.filter(item => item !== label) : [label]);\n  };\n  \n  return (\n    <aside style={{ width: '280px', flexShrink: 0, backgroundColor: '#1C1C24', color: '#d1d5db', display: 'flex', flexDirection: 'column' }}>\n      <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #374151' }}>\n         <img src="/logo.svg" alt="Logo" style={{ height: '32px', width: '32px', filter: 'brightness(0) invert(1)' }} />\n      </div>\n      <nav style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>\n        {menuItems.map((item, index) => {\n          if (item.isTitle) {\n            const isActive = location.pathname === item.path;\n            const Icon = iconMap['Clock'];\n            return <Link key={index} to={item.path} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#d1d5db', background: isActive ? '#374151' : 'transparent', borderRadius: '6px' }}><Icon style={{ height: '20px', width: '20px', marginRight: '12px' }} />{item.label}</Link>\n          }\n          if (item.children) {\n            const isParentActive = item.children.some(child => location.pathname.startsWith(child.path));\n            const isOpen = openItems.includes(item.label);\n            const ParentIcon = iconMap[item.icon || 'Clock'];\n            return (\n              <Collapsible.Root key={item.label} open={isOpen} onOpenChange={() => toggleItem(item.label)} style={{ marginTop: '8px' }}>\n                <Collapsible.Trigger style={{ all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', fontSize: '14px', fontWeight: 500, borderRadius: '6px', color: isParentActive ? 'white' : '#d1d5db', cursor: 'pointer', background: isParentActive ? '#374151' : 'transparent' }}>\n                  <div style={{ display: 'flex', alignItems: 'center' }}>\n                    <ParentIcon style={{ height: '20px', width: '20px', marginRight: '12px' }} />\n                    <span>{item.label}</span>\n                  </div>\n                  <ChevronRight style={{ height: '16px', width: '16px', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />\n                </Collapsible.Trigger>\n                <Collapsible.Content style={{ paddingLeft: '44px', marginTop: '4px', borderLeft: '1px solid #374151', marginLeft: '16px' }}>\n                  {item.children.map(child => {\n                    const isChildActive = location.pathname.startsWith(child.path);\n                    return <Link key={child.label} to={child.path} style={{ display: 'flex', padding: '8px 0', fontSize: '14px', color: isChildActive ? 'white' : '#9ca3af', textDecoration: 'none', fontWeight: isChildActive ? 600 : 400 }}>{child.label}</Link>\n                  })}\n                </Collapsible.Content>\n              </Collapsible.Root>\n            );\n          }\n          return null;\n        })}\n      </nav>\n    </aside>\n  );\n};\nexport default Sidebar;`
  );

  fs.writeFileSync(
    path.join(layoutPath, "Header.tsx"),
    `import React from "react";\nimport BreadcrumbsComponent from "./Breadcrumbs";\nimport * as Avatar from '@radix-ui/react-avatar';\nimport { ChevronLeft } from 'lucide-react';\nimport { menuItems } from '../config/menu';\n\nconst Header = () => {\n  return (\n    <header style={{ backgroundColor: 'white', height: '64px', flexShrink: 0, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>\n      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>\n          <button onClick={() => window.history.back()} style={{ all: 'unset', cursor: 'pointer', padding: '6px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>\n            <ChevronLeft style={{ height: '20px', width: '20px', color: '#4b5563' }} />\n          </button>\n          <BreadcrumbsComponent menuItems={menuItems} />\n      </div>\n      <Avatar.Root style={{ backgroundColor: '#e5e7eb', display: 'inline-flex', height: '40px', width: '40px', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '9999px' }}>\n        <Avatar.Fallback style={{ color: '#4b5563', fontSize: '16px', fontWeight: 500 }}>M</Avatar.Fallback>\n      </Avatar.Root>\n    </header>\n  );\n};\nexport default Header;`
  );

  fs.writeFileSync(
    path.join(layoutPath, "Breadcrumbs.tsx"),
    `import React from "react";\nimport { useLocation } from "react-router-dom";\nimport { ChevronRight } from "lucide-react";\n\nconst BreadcrumbsComponent = ({ menuItems }) => {\n  const location = useLocation();\n  const pathnames = location.pathname.split('/').filter((x) => x);\n\n  let parentLabel = "Dashboard";\n  let entityTitle = "";\n  if (pathnames.length > 0) {\n    const currentPath = \`/\${pathnames[0]}\`;\n    entityTitle = pathnames[0].charAt(0).toUpperCase() + pathnames[0].slice(1).replace(/-/g, ' ');\n    const parent = menuItems.find(item => item.children?.some(child => child.path === currentPath));\n    if (parent) {\n      parentLabel = parent.label;\n    } else if (pathnames[0] === 'dashboard') {\n      parentLabel = 'Quick Links';\n      entityTitle = '';\n    }\n  }\n\n  const getAction = () => {\n    if (location.pathname.endsWith('/new')) return 'Create';\n    if (pathnames[pathnames.length - 1] === 'edit') return 'Edit';\n    return null;\n  };\n  \n  const action = getAction();\n  \n  return (\n    <nav style={{ display: 'flex' }} aria-label="Breadcrumb">\n      <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>\n        <li style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>\n          {parentLabel}\n        </li>\n        {entityTitle && (\n          <li>\n            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>\n              <ChevronRight style={{ height: '20px', width: '20px', color: '#d1d5db' }} />\n              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{entityTitle}</span>\n            </div>\n          </li>\n        )}\n        {action && (\n           <li>\n            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>\n              <ChevronRight style={{ height: '20px', width: '20px', color: '#d1d5db' }} />\n              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{action}</span>\n            </div>\n          </li>\n        )}\n      </ol>\n    </nav>\n  );\n};\nexport default BreadcrumbsComponent;`
  );

  fs.writeFileSync(
    path.join(layoutPath, "Footer.tsx"),
    `import React from "react";\n\nconst Footer = () => {\n  return (\n    <footer style={{ backgroundColor: 'white', padding: '16px', borderTop: '1px solid #e5e7eb' }}>\n      <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>{'2025 © LoyRex. All Rights Reserved.'}</p>\n    </footer>\n  );\n};\nexport default Footer;`
  );

  console.log("✅ Dynamic UI files generated with all fixes.");
}