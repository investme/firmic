import { ThemeProvider } from "@/components/theme/theme-provider"
import { CommandPalette } from "@/components/layout/command-palette"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <CommandPalette />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}