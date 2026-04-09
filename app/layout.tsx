import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financeiro",
  description: "App financeiro com entradas, saídas, clientes e fornecedores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
