export const metadata = {
  title: "Sarkari Jobs Board",
  description: "Upcoming, ongoing, and past Indian government job notifications"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
