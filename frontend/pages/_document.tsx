import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="icon"
          type="image/png"
          href="/favicon.png"
        />

        <link
          rel="shortcut icon"
          type="image/png"
          href="/favicon.png"
        />

        <link
          rel="apple-touch-icon"
          href="/favicon.png"
        />

        <meta
          name="theme-color"
          content="#0A1F3D"
        />
      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
