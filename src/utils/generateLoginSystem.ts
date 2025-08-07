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
  const identityField = fields.find(f => f.uiType === 'login:identity');
  const passwordField = fields.find(f => f.uiType === 'password');

  if (!identityField || !passwordField) {
    console.warn(`⚠️ Skipping login system: Sheet "${sheetName}" must contain one field with uiType 'login:identity' and one with uiType 'password'.`);
    return;
  }

  const modelNamePascal = pascalCase(sheetName);

  // =======================================================
  // 1. Generate Frontend Login Page (Login.tsx) with Radix UI
  // =======================================================
  const loginPagePath = path.resolve(__dirname, "../../../frontend/src/pages");
  if (!fs.existsSync(loginPagePath)) fs.mkdirSync(loginPagePath, { recursive: true });

  const loginPageCode = `
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import * as Form from '@radix-ui/react-form';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Lock, Eye, EyeOff, RefreshCw, Mail, Phone, Terminal, Check } from 'lucide-react';

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
    <>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        button, input, textarea, select { font-family: inherit; }
      \`}</style>
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 text-white rounded-full p-3">
                <Terminal className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to access your dashboard</p>
          </div>

          <Form.Root onSubmit={handleSubmit} className="space-y-6">
            <Form.Field name="${identityField.fieldName}" className="space-y-2">
              <Form.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">${identityField.label}</Form.Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  ${identityField.type === 'email' ? `<Mail className="h-5 w-5 text-gray-400" />` : `<Phone className="h-5 w-5 text-gray-400" />`}
                </span>
                <Form.Control asChild>
                  <input
                    type="${identityField.type === 'email' ? 'email' : 'text'}"
                    required
                    autoFocus
                    value={formData.${identityField.fieldName}}
                    onChange={handleChange}
                    placeholder="Enter your ${identityField.label.toLowerCase()}"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </Form.Control>
              </div>
            </Form.Field>

            <Form.Field name="${passwordField.fieldName}" className="space-y-2">
              <Form.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Form.Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </span>
                <Form.Control asChild>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.${passwordField.fieldName}}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </Form.Control>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Form.Field>
            
            <Form.Field name="captcha" className="space-y-2">
              <Form.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Check</Form.Label>
              <div className="flex items-center gap-2">
                <Form.Control asChild>
                  <input
                    type="text"
                    value={userCaptcha}
                    onChange={(e) => { setError(''); setUserCaptcha(e.target.value); }}
                    placeholder="Enter text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </Form.Control>
                <div className="select-none tracking-widest bg-gray-200 dark:bg-gray-700 dark:text-gray-300 p-2 rounded-md font-mono font-bold text-center w-36">{captcha}</div>
                <button type="button" onClick={generateCaptcha} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </Form.Field>

            {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox.Root id="remember-me" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                  <Checkbox.Indicator>
                    <Check className="h-4 w-4 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Remember me</label>
              </div>
              <div className="text-sm">
                <Link to="#" className="font-medium text-blue-600 hover:text-blue-500">Forgot Password?</Link>
              </div>
            </div>

            <Form.Submit asChild>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In to Dashboard
              </button>
            </Form.Submit>
          </Form.Root>
        </div>
      </div>
    </>
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
    const secret = process.env.JWT_SECRET || 'my_default_hardcoded_secret_for_development_only';
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

  console.log(`✅ Radix UI Login System for "${sheetName}" generated successfully.`);
}