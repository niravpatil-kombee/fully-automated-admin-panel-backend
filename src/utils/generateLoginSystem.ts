// src/utils/generateLoginSystem.ts

import fs from "fs";
import path from "path";

// Define the types this generator needs
type Field = {
  label: string;
  fieldName: string;
  type: string;
  required: boolean;
  uiType: string;
  options?: string;
  reference?: string;
};

// UTILITY FUNCTION - Defined locally so this file is self-contained
function pascalCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// The main generator function for the authentication system
export function generateLoginSystem(sheetName: string, fields: Field[]) {
  console.log("hello from generateLoginSystem"); // Your debug log

  // ✅ THE FIX IS HERE: We find both fields by their 'uiType'.
  const identityField = fields.find(f => f.uiType === 'login:identity');
  const passwordField = fields.find(f => f.uiType === 'password');

  if (!identityField || !passwordField) {
    console.warn(`⚠️ Skipping login system: Sheet "${sheetName}" must contain one field with uiType 'login:identity' and one with uiType 'password'.`);
    return;
  }

  const modelNamePascal = pascalCase(sheetName);

  // =======================================================
  // 1. Generate Frontend Login Page (Login.tsx)
  // =======================================================
  const loginPagePath = path.resolve(__dirname, "../../../frontend/src/pages");
  if (!fs.existsSync(loginPagePath)) fs.mkdirSync(loginPagePath, { recursive: true });

  const loginPageCode = `
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Paper, Typography, TextField, Button, FormControlLabel, Checkbox, Link, Avatar, IconButton, InputAdornment } from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff, Refresh, MailOutline, Phone as PhoneIcon } from '@mui/icons-material';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ ${identityField.fieldName}: '', ${passwordField.fieldName}: '' });
  const [captcha, setCaptcha] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userCaptcha.toUpperCase() !== captcha.toUpperCase()) {
      setError('Invalid CAPTCHA');
      generateCaptcha();
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('authToken', response.data.token);
      axios.defaults.headers.common['Authorization'] = \`Bearer \${response.data.token}\`;
      navigate('/');
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
      generateCaptcha();
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    }}>
      <Paper elevation={8} sx={{ p: {xs: 3, sm: 4}, width: '100%', maxWidth: 420, borderRadius: 4, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ m: 1, bgcolor: '#1976d2', width: 56, height: 56 }}><LockOutlined /></Avatar>
          <Typography component="h1" variant="h5" fontWeight="bold">Admin Portal</Typography>
          <Typography variant="body2" color="text.secondary">Sign in to access your dashboard</Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>${identityField.label}</Typography>
          <TextField
            fullWidth
            required
            autoFocus
            name="${identityField.fieldName}"
            value={formData.${identityField.fieldName}}
            onChange={handleChange}
            placeholder="Enter your ${identityField.label.toLowerCase()}"
            InputProps={{ startAdornment: <InputAdornment position="start">${identityField.type === 'email' ? `<MailOutline color="action" />` : `<PhoneIcon color="action" />`}</InputAdornment> }}
          />
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Password</Typography>
          <TextField
            fullWidth
            required
            name="${passwordField.fieldName}"
            type={showPassword ? 'text' : 'password'}
            value={formData.${passwordField.fieldName}}
            onChange={handleChange}
            placeholder="Enter your password"
            InputProps={{
              startAdornment: <InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Security Verification</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField fullWidth placeholder="Enter captcha" value={userCaptcha} onChange={(e) => { setError(''); setUserCaptcha(e.target.value); }} />
            <Box sx={{ userSelect: 'none', letterSpacing: '0.3em', bgcolor: 'grey.200', p: '10px 15px', borderRadius: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>{captcha}</Box>
            <IconButton onClick={generateCaptcha}><Refresh /></IconButton>
          </Box>
          {error && <Typography color="error" variant="body2" align="center" sx={{ mt: 2 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Remember me" />
            <Link href="#" variant="body2" sx={{ fontWeight: 500 }}>Forgot Password?</Link>
          </Box>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 14px 0 rgb(25 118 210 / 39%)' }}>
            Sign In to Dashboard
          </Button>
          <Typography variant="caption" color="text.secondary" align="center" display="block">Protected by enterprise-grade security.</Typography>
        </Box>
      </Paper>
    </Box>
  );
};
export default LoginPage;
`;
  fs.writeFileSync(path.join(loginPagePath, `Login.tsx`), loginPageCode.trim());

  // =======================================================
  // 2. Generate Frontend Protected Route Component
  // =======================================================
  const componentsPath = path.resolve(__dirname, "../../../frontend/src/components");
  if (!fs.existsSync(componentsPath)) fs.mkdirSync(componentsPath, { recursive: true });

  const protectedRouteCode = `
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
`;
  fs.writeFileSync(path.join(componentsPath, `ProtectedRoute.tsx`), protectedRouteCode.trim());

  // =======================================================
  // 3. Generate Backend Login Controller & Route
  // =======================================================
  const backendBaseDir = path.resolve(__dirname, "../generated-backend");
  const authControllerPath = path.join(backendBaseDir, "controller", `auth.controller.ts`);
  const authRoutePath = path.join(backendBaseDir, "routes", `auth.routes.ts`);

  if (!fs.existsSync(path.join(backendBaseDir, "controller"))) fs.mkdirSync(path.join(backendBaseDir, "controller"), { recursive: true });
  if (!fs.existsSync(path.join(backendBaseDir, "routes"))) fs.mkdirSync(path.join(backendBaseDir, "routes"), { recursive: true });

  const authControllerCode = `
import { Request, Response } from "express";
import { ${modelNamePascal} } from "../model/${sheetName.toLowerCase().replace(/\s/g, '-')}.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  const { ${identityField.fieldName}, ${passwordField.fieldName} } = req.body;
  if (!${identityField.fieldName} || !${passwordField.fieldName}) {
    return res.status(400).json({ message: "Please provide all required fields." });
  }
  try {
    const user = await ${modelNamePascal}.findOne({ ${identityField.fieldName} });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(${passwordField.fieldName}, (user as any).${passwordField.fieldName});
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const payload = { id: user.id };
    const secret = 'my_default_hardcoded_secret_for_development_only';
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });
    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};
`;

  const authRouteCode = `
import express from "express";
import { login } from "../controller/auth.controller";
const router = express.Router();
router.post("/api/auth/login", login);
export default router;
`;
  fs.writeFileSync(authControllerPath, authControllerCode.trim());
  fs.writeFileSync(authRoutePath, authRouteCode.trim());

  console.log(`✅ Login System for "${sheetName}" generated successfully.`);
}