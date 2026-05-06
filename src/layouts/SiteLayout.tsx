import React from 'react';
import { Navbar } from '@/components/site/Navbar';
import { Footer } from '@/components/site/Footer';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col pt-16 lg:pt-20">
      <Navbar />
      
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
};
