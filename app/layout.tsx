import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="scrollbar-track-transparent scrollbar-thumb-foreground/10 dark:bg-gray-900 dark:text-gray-100"
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Gemini AI Data Analyst</title>
        <meta name="description" content="This is an AI-powered code and data analysis tool built with Next.js and Gemini." />
      </head>
      <body className="bg-white text-black dark:bg-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
