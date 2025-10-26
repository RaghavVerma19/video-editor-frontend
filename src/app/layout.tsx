import "../styles/globals.css";
import { SplitProvider } from "../context/SplitProvider";

export const metadata = {
  title: "Astral",
  description: "Starter app for splitting and editing video clips",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <SplitProvider>
            <div className="max-w-6xl mx-auto p-6">
              <header className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Astral</h1>
                  <p className="text-sm text-gray-500">
                    Split a video into parts and edit each part independently.
                  </p>
                </div>
                <nav></nav>
              </header>
              {children}
            </div>
          </SplitProvider>
        </div>
      </body>
    </html>
  );
}
