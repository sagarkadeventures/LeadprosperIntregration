import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Apply for a Loan | RadCred",
  description: "Apply for a personal loan with RadCred. Fast approval, competitive rates.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              padding: "14px 20px",
              fontSize: "0.9rem",
              fontFamily: '"DM Sans", system-ui, sans-serif',
            },
            success: { iconTheme: { primary: "#2563eb", secondary: "#fff" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
