import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from '../components/navigation/AppShell';

export const RootLayout: React.FC = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

export default RootLayout;
