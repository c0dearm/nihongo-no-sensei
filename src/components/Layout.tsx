import React from 'react';

interface LayoutProps {
  header: React.ReactNode;
  main: React.ReactNode;
  settings?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ header, main, settings }) => {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg font-sans flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl h-[95vh] max-h-[800px] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {header}
        <main className="flex-grow flex flex-col min-h-0">
          {main}
        </main>
        {settings}
      </div>
    </div>
  );
};

export default Layout;
