/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { RoleProvider } from './context/RoleContext';
import { ToastProvider } from './context/ToastContext';
import { router } from './router';

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
